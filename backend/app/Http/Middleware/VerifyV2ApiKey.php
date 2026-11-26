<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyV2ApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->getUser();
        $secret = $request->getPassword();

        // Fallback parser in case Apache/PHP-FPM placed Authorization in REDIRECT_HTTP_AUTHORIZATION
        $authHeader = (string) (
            $request->header('Authorization')
            ?: $request->server('HTTP_AUTHORIZATION')
            ?: $request->server('REDIRECT_HTTP_AUTHORIZATION')
            ?: ''
        );
        if ((!$key || !$secret) && str_starts_with($authHeader, 'Basic ')) {
            $decoded = base64_decode(substr($authHeader, 6), true);
            if ($decoded !== false && str_contains($decoded, ':')) {
                [$key, $secret] = explode(':', $decoded, 2);
            }
        }

        if (!ApiKey::verify($key, $secret)) {
            return response()->json([
                'message' => 'غير مصرح — مفتاح الـ API غير صالح أو غير مفعّل',
            ], 401);
        }

        return $next($request);
    }
}
