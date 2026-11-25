<?php

namespace App\Support;

/**
 * See App\Support\OriginHttp for why this exists. A small baseUrl+auth
 * bound client — mirrors Http::withBasicAuth(...)->baseUrl(...).
 */
class OriginHttpClient
{
    public function __construct(private string $baseUrl, private ?array $basicAuth) {}

    public function get(string $path, array $query = []): OriginHttpResponse
    {
        return new OriginHttpResponse(OriginHttp::get("{$this->baseUrl}/{$path}", $query, basicAuth: $this->basicAuth));
    }

    public function post(string $path, array $body = []): OriginHttpResponse
    {
        return new OriginHttpResponse(OriginHttp::post("{$this->baseUrl}/{$path}", $body, basicAuth: $this->basicAuth));
    }

    public function put(string $path, array $body = []): OriginHttpResponse
    {
        return new OriginHttpResponse(OriginHttp::put("{$this->baseUrl}/{$path}", $body, basicAuth: $this->basicAuth));
    }
}
