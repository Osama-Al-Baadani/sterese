<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    private string $projectId;
    private string $credentialPath;

    public function __construct()
    {
        $this->projectId    = config('services.firebase.project_id', '');
        $this->credentialPath = config('services.firebase.credential_path', '');
    }

    /**
     * Send notification to a single device token.
     */
    public function sendToDevice(string $deviceToken, string $title, string $body, array $data = []): bool
    {
        try {
            $token = $this->getAccessToken();
            if (!$token) {
                Log::warning('FCM: could not get access token');
                return false;
            }

            $payload = [
                'message' => [
                    'token'        => $deviceToken,
                    'notification' => ['title' => $title, 'body' => $body],
                    'data'         => array_map('strval', $data),
                    'android'      => ['priority' => 'high'],
                    'apns'         => ['headers' => ['apns-priority' => '10']],
                ],
            ];

            $res = Http::withToken($token)
                ->post("https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send", $payload);

            if ($res->failed()) {
                Log::warning('FCM sendToDevice failed', ['body' => $res->body()]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('FCM exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send notification to a topic (e.g. 'promotions').
     */
    public function sendToTopic(string $topic, string $title, string $body, array $data = []): bool
    {
        try {
            $token = $this->getAccessToken();
            if (!$token) {
                Log::warning('FCM: could not get access token');
                return false;
            }

            $payload = [
                'message' => [
                    'topic'        => $topic,
                    'notification' => ['title' => $title, 'body' => $body],
                    'data'         => array_map('strval', $data),
                    'android'      => ['priority' => 'high'],
                    'apns'         => ['headers' => ['apns-priority' => '10']],
                ],
            ];

            $res = Http::withToken($token)
                ->post("https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send", $payload);

            if ($res->failed()) {
                Log::warning('FCM send failed', ['body' => $res->body()]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('FCM exception: ' . $e->getMessage());
            return false;
        }
    }

    private function getAccessToken(): ?string
    {
        if (!file_exists($this->credentialPath)) {
            Log::warning('FCM: credential file not found at ' . $this->credentialPath);
            return null;
        }

        $creds = json_decode(file_get_contents($this->credentialPath), true);

        $now = time();
        $claim = [
            'iss'   => $creds['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud'   => 'https://oauth2.googleapis.com/token',
            'iat'   => $now,
            'exp'   => $now + 3600,
        ];

        $jwt = $this->buildJwt($creds['private_key'], $claim);

        $res = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ]);

        return $res->json('access_token');
    }

    private function buildJwt(string $privateKey, array $claims): string
    {
        $header  = $this->base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $payload = $this->base64url(json_encode($claims));
        $toSign  = "$header.$payload";

        openssl_sign($toSign, $signature, $privateKey, OPENSSL_ALGO_SHA256);

        return "$toSign." . $this->base64url($signature);
    }

    private function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
