<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class StorefrontCache
{
    public const VERSION_KEY = 'catalog_cache_ver';

    private static bool $revalidateScheduled = false;

    public static function version(): string
    {
        $ver = Cache::get(self::VERSION_KEY);
        if (!is_string($ver) || $ver === '') {
            $ver = self::generateVersion();
            Cache::forever(self::VERSION_KEY, $ver);
        }

        return $ver;
    }

    /**
     * Immediately invalidates all storefront caches in Laravel and notifies
     * the Next.js storefront (once per request lifecycle) so changes appear
     * instantaneously without waiting for TTL expiry.
     */
    public static function bump(): string
    {
        $ver = self::generateVersion();

        Cache::forever(self::VERSION_KEY, $ver);
        Cache::forget('app_config');
        Cache::forget('api_home_sections');
        Cache::forget('api_home_departments');
        Cache::forget('products_list_stats_v1');
        Cache::forget('nav_badge_products_count');
        Cache::forget('dashboard_stats_overview_v1');

        if (!self::$revalidateScheduled) {
            self::$revalidateScheduled = true;

            app()->terminating(function () {
                self::$revalidateScheduled = false;
                self::notifyFrontend(self::version());
            });
        }

        return $ver;
    }

    private static function generateVersion(): string
    {
        return (string) (int) round(microtime(true) * 1000) . '-' . mt_rand(100, 999);
    }

    private static function notifyFrontend(string $version): void
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        if ($frontendUrl === '') {
            return;
        }

        try {
            $secret = (string) env('REVALIDATE_SECRET', '');
            Http::connectTimeout(0.3)
                ->timeout(0.8)
                ->withHeaders($secret !== '' ? ['x-revalidate-secret' => $secret] : [])
                ->post("{$frontendUrl}/api/revalidate", [
                    'version' => $version,
                ]);
        } catch (\Throwable) {
            // Non-blocking: open storefront tabs also self-heal via /api/storefront-version.
        }
    }
}
