<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiKey extends Model
{
    /**
     * Populated only at creation/regeneration time so the admin or CLI caller
     * (`$k = ApiKey::create(['label' => '...']); echo $k->plainSecret;`) can
     * copy the raw secret once before only its hash remains stored.
     */
    public ?string $plainSecret = null;

    protected $fillable = [
        'label',
        'key',
        'secret_hash',
        'is_active',
        'last_used_at',
    ];

    protected $hidden = [
        'secret_hash',
    ];

    protected $casts = [
        'is_active'    => 'boolean',
        'last_used_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $apiKey) {
            if (empty($apiKey->key)) {
                $apiKey->key = 'ck_' . Str::random(32);
            }

            if (empty($apiKey->secret_hash)) {
                $plain = $apiKey->plainSecret ?: ('cs_' . Str::random(40));
                $apiKey->plainSecret = $plain;
                $apiKey->secret_hash = Hash::make($plain);
            }
        });

        static::saved(function (self $apiKey) {
            Cache::increment('v2_apikey_ver');
        });

        static::deleted(function (self $apiKey) {
            Cache::increment('v2_apikey_ver');
        });
    }

    public function regenerateSecret(): string
    {
        $plain = 'cs_' . Str::random(40);
        $this->plainSecret = $plain;
        $this->update([
            'secret_hash' => Hash::make($plain),
        ]);

        return $plain;
    }

    public static function verify(?string $key, ?string $secret): bool
    {
        if (!$key || !$secret) {
            return false;
        }

        $envKey = (string) config('services.v2_api.key', '');
        $envSecret = (string) config('services.v2_api.secret', '');
        if ($envKey !== '' && $envSecret !== '' && hash_equals($envKey, $key) && hash_equals($envSecret, $secret)) {
            return true;
        }

        $ver = (int) Cache::get('v2_apikey_ver', 1);
        $cacheKey = 'v2_apikey_ok:' . $ver . ':' . hash('sha256', $key . ':' . $secret);

        if (Cache::get($cacheKey) === true) {
            return true;
        }

        $record = static::where('key', $key)->where('is_active', true)->first();
        if (!$record) {
            return false;
        }

        if (!Hash::check($secret, $record->secret_hash)) {
            return false;
        }

        Cache::put($cacheKey, true, now()->addMinutes(10));

        if ($record->last_used_at === null || $record->last_used_at->lt(now()->subMinutes(5))) {
            $record->updateQuietly(['last_used_at' => now()]);
        }

        return true;
    }
}
