<?php

namespace App\Support;

/**
 * See App\Support\OriginHttp for why this exists. Wraps the plain result
 * array from OriginHttp::request() with the small slice of
 * Illuminate\Http\Client\Response's interface this codebase actually
 * calls: ->successful(), ->status(), ->body(), ->json().
 */
class OriginHttpResponse
{
    public function __construct(private array $result) {}

    public function successful(): bool
    {
        return $this->result['successful'];
    }

    public function status(): int
    {
        return $this->result['status'];
    }

    public function body(): string
    {
        return $this->result['body'];
    }

    public function json(?string $key = null, mixed $default = null): mixed
    {
        $data = $this->result['json'];
        if ($key === null) return $data;
        return data_get($data, $key, $default);
    }
}
