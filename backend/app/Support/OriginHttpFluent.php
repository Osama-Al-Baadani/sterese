<?php

namespace App\Support;

/**
 * See App\Support\OriginHttp for why this exists. A chainable stand-in
 * for Http::timeout(...) — supports withBasicAuth()/withHeaders()/
 * baseUrl()/asJson() chaining so an existing call site that built a
 * request that way keeps working unchanged.
 */
class OriginHttpFluent
{
    private ?array $basicAuth = null;
    private array $headers = [];
    private string $baseUrl = '';

    public function withBasicAuth(string $user, string $pass): static
    {
        $this->basicAuth = [$user, $pass];
        return $this;
    }

    public function withHeaders(array $headers): static
    {
        $this->headers = array_merge($this->headers, $headers);
        return $this;
    }

    public function baseUrl(string $url): static
    {
        $this->baseUrl = rtrim($url, '/');
        return $this;
    }

    // No-op — every request here is already JSON in both directions.
    public function asJson(): static
    {
        return $this;
    }

    private function resolve(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        return $this->baseUrl !== '' ? "{$this->baseUrl}/{$path}" : $path;
    }

    public function get(string $path, array $query = []): OriginHttpResponse
    {
        return new OriginHttpResponse(OriginHttp::get($this->resolve($path), $query, $this->headers, $this->basicAuth));
    }

    public function post(string $path, array $body = []): OriginHttpResponse
    {
        return new OriginHttpResponse(OriginHttp::post($this->resolve($path), $body, $this->headers, $this->basicAuth));
    }

    public function put(string $path, array $body = []): OriginHttpResponse
    {
        return new OriginHttpResponse(OriginHttp::put($this->resolve($path), $body, $this->headers, $this->basicAuth));
    }
}
