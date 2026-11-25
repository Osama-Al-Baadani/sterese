<?php

namespace App\Support;

/**
 * Same-server HTTP client with an automatic fallback to the shell `curl`
 * binary when PHP's own HTTP stack gets blocked.
 *
 * Starting 2026-09-17, this shared host has intermittently blocked
 * outbound HTTPS requests that (a) originate from a PHP process and
 * (b) target a domain hosted on this same account — storeseco.com and
 * api.storeseco.com are both on 72.62.19.231, so every WooCommerce call
 * this Laravel app makes is exactly that pattern. Hostinger support
 * confirmed (2026-09-18) this isn't a fixed rule but an automatic
 * anti-bot/CAPTCHA challenge that activates when the account's CPU
 * usage is high, and self-clears once usage stays low for ~15 minutes —
 * it cannot be whitelisted per-path or per-domain.
 *
 * That makes the earlier "always shell out to curl" workaround actively
 * counterproductive: shell_exec() forks a whole new OS process for
 * *every* WooCommerce call this app makes (pricing lookups, OTP customer
 * lookups, order sync, wallet checks, ...), which is real, avoidable CPU
 * load — i.e. it was contributing to the very condition that triggers
 * the block in the first place. So this now tries the cheap, in-process
 * native curl_exec() path FIRST, and only pays the fork cost as a
 * fallback when the native attempt actually gets challenged (a 403 with
 * an HTML "Bot Verification" body instead of the expected JSON).
 *
 * Ask any future Hostinger ticket about this to reference: "an
 * account-level automatic anti-bot challenge, triggered by CPU usage,
 * returns an HTML reCAPTCHA 'Bot Verification' page (posting to
 * /.lsrecap/recaptcha) instead of JSON for API requests — both from
 * PHP-originated requests to this same account's domains and from the
 * mobile app's own direct HTTPS requests. Support already confirmed this
 * is tied to resource usage and self-clears after ~15 minutes of low,
 * stable CPU usage."
 *
 * Kept as ONE class per file (OriginHttpFluent / OriginHttpClient /
 * OriginHttpResponse each in their own file) on purpose — Composer's
 * PSR-4 autoloader maps a class name straight to a single expected file
 * path, so a second class sharing this file was invisible to it and
 * only loaded by accident (when something touched OriginHttp first in
 * the same request) — surfaced as a live "Class ... not found" on the
 * one call site that constructed OriginHttpResponse without going
 * through OriginHttp first.
 */
class OriginHttp
{
    /**
     * @param  string  $method  GET|POST|PUT|PATCH|DELETE
     * @param  array<string,mixed>  $query  Appended to the URL as a query string.
     * @param  array<string,mixed>|null  $jsonBody  Sent as the JSON request body (POST/PUT/PATCH).
     * @param  array<string,string>  $headers  Extra headers, e.g. ['X-Wallet-Secret' => '...'].
     * @param  array{0:string,1:string}|null  $basicAuth  [username, password].
     * @return array{status:int, body:string, json:mixed, successful:bool}
     */
    public static function request(
        string $method,
        string $url,
        array $query = [],
        ?array $jsonBody = null,
        array $headers = [],
        ?array $basicAuth = null,
        int $timeoutSeconds = 20,
    ): array {
        if (!empty($query)) {
            $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($query);
        }

        $method = strtoupper($method);

        $native = self::nativeRequest($method, $url, $jsonBody, $headers, $basicAuth, $timeoutSeconds);
        if ($native !== null && !self::isChallenged($native)) {
            return $native;
        }

        return self::shellRequest($method, $url, $jsonBody, $headers, $basicAuth, $timeoutSeconds);
    }

    /**
     * Cheap, in-process attempt via PHP's own cURL extension — no
     * subprocess fork. Returns null (never the fallback's job to decide)
     * only on a hard cURL-level failure (e.g. DNS/connect error), so the
     * shell fallback still gets a chance in that case too.
     *
     * @return array{status:int, body:string, json:mixed, successful:bool}|null
     */
    private static function nativeRequest(
        string $method,
        string $url,
        ?array $jsonBody,
        array $headers,
        ?array $basicAuth,
        int $timeoutSeconds,
    ): ?array {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeoutSeconds);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $headerLines = [];
        foreach ($headers as $name => $value) {
            $headerLines[] = "{$name}: {$value}";
        }

        if ($basicAuth !== null) {
            curl_setopt($ch, CURLOPT_USERPWD, "{$basicAuth[0]}:{$basicAuth[1]}");
        }

        if ($jsonBody !== null) {
            $headerLines[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($jsonBody));
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headerLines);

        $body = curl_exec($ch);
        if ($body === false) {
            curl_close($ch);
            return null;
        }

        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return [
            'status'     => $status,
            'body'       => $body,
            'json'       => json_decode($body, true),
            'successful' => $status >= 200 && $status < 300,
        ];
    }

    /** True if a response looks like the host's anti-bot challenge page rather than a real API response. */
    private static function isChallenged(array $result): bool
    {
        return $result['status'] === 403 && str_contains($result['body'], 'Bot Verification');
    }

    /**
     * @return array{status:int, body:string, json:mixed, successful:bool}
     */
    private static function shellRequest(
        string $method,
        string $url,
        ?array $jsonBody,
        array $headers,
        ?array $basicAuth,
        int $timeoutSeconds,
    ): array {
        $parts = ['curl', '-s', '-m', escapeshellarg((string) $timeoutSeconds)];
        $parts[] = '-X'; $parts[] = escapeshellarg($method);
        $parts[] = '-w'; $parts[] = escapeshellarg("\n__STORESECO_STATUS__:%{http_code}");

        foreach ($headers as $name => $value) {
            $parts[] = '-H'; $parts[] = escapeshellarg("{$name}: {$value}");
        }

        if ($basicAuth !== null) {
            $parts[] = '-u'; $parts[] = escapeshellarg("{$basicAuth[0]}:{$basicAuth[1]}");
        }

        if ($jsonBody !== null) {
            $parts[] = '-H'; $parts[] = escapeshellarg('Content-Type: application/json');
            $parts[] = '--data-binary'; $parts[] = escapeshellarg(json_encode($jsonBody));
        }

        $parts[] = escapeshellarg($url);

        $output = shell_exec(implode(' ', $parts) . ' 2>/dev/null');
        $output = $output ?? '';

        $status = 0;
        $body = $output;
        if (preg_match('/\n__STORESECO_STATUS__:(\d+)\s*$/', $output, $m)) {
            $status = (int) $m[1];
            $body = substr($output, 0, -strlen($m[0]));
        }

        $json = json_decode($body, true);

        return [
            'status'     => $status,
            'body'       => $body,
            'json'       => $json,
            'successful' => $status >= 200 && $status < 300,
        ];
    }

    public static function get(string $url, array $query = [], array $headers = [], ?array $basicAuth = null, int $timeout = 20): array
    {
        return self::request('GET', $url, $query, null, $headers, $basicAuth, $timeout);
    }

    public static function post(string $url, ?array $jsonBody = null, array $headers = [], ?array $basicAuth = null, int $timeout = 20): array
    {
        return self::request('POST', $url, [], $jsonBody, $headers, $basicAuth, $timeout);
    }

    public static function put(string $url, ?array $jsonBody = null, array $headers = [], ?array $basicAuth = null, int $timeout = 20): array
    {
        return self::request('PUT', $url, [], $jsonBody, $headers, $basicAuth, $timeout);
    }

    /**
     * A fluent client mirroring the small slice of Laravel's
     * Http::baseUrl()->withBasicAuth() surface this codebase actually
     * calls (get/post/put, each returning something with ->successful(),
     * ->json(), ->status(), ->body()) — a drop-in replacement for
     * `Http::withBasicAuth(...)->baseUrl(...)` wherever the target is
     * this same server, without having to rewrite every call site.
     */
    public static function client(string $baseUrl, ?array $basicAuth = null): OriginHttpClient
    {
        return new OriginHttpClient(rtrim($baseUrl, '/'), $basicAuth);
    }

    /**
     * A fluent, chainable stand-in for Http::timeout(...) — supports the
     * same withBasicAuth()/withHeaders()/baseUrl()/asJson() chaining this
     * codebase already calls on the real Http facade, so a method that
     * used to `return Http::timeout(10)` can instead
     * `return OriginHttp::fluent()` and every existing call site keeps
     * working unchanged.
     */
    public static function fluent(): OriginHttpFluent
    {
        return new OriginHttpFluent();
    }
}
