<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Sends a cart-reminder template message via Meta's WhatsApp Cloud API
     * once the app is configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID
     * in .env). Until those arrive, falls back to just logging so the
     * abandoned-cart flow keeps working end-to-end for testing.
     *
     * The template must already be approved in Meta Business Manager with
     * two body variables ({{1}} = customer name, {{2}} = cart total) and a
     * static URL button pointing at https://storeseco.com/app/cart.
     */
    public function sendCartReminder(string $phone, string $name, float $total): bool
    {
        $token         = config('services.whatsapp.token');
        $phoneNumberId = config('services.whatsapp.phone_number_id');
        $template      = config('services.whatsapp.template_name');
        $language      = config('services.whatsapp.language');

        if (!$token || !$phoneNumberId) {
            Log::info('[WhatsApp] (stub — Cloud API credentials not configured yet)', [
                'phone' => $phone,
                'name'  => $name,
                'total' => $total,
            ]);
            return true;
        }

        try {
            $res = Http::withToken($token)
                ->timeout(10)
                ->post("https://graph.facebook.com/v20.0/{$phoneNumberId}/messages", [
                    'messaging_product' => 'whatsapp',
                    'to'                => $this->toInternationalFormat($phone),
                    'type'              => 'template',
                    'template'          => [
                        'name'     => $template,
                        'language' => ['code' => $language],
                        'components' => [
                            [
                                'type'       => 'body',
                                'parameters' => [
                                    ['type' => 'text', 'text' => $name ?: 'عميلنا العزيز'],
                                    ['type' => 'text', 'text' => number_format($total, 2)],
                                ],
                            ],
                        ],
                    ],
                ]);

            if (!$res->successful()) {
                Log::warning('[WhatsApp] Cloud API send failed', [
                    'phone'    => $phone,
                    'response' => $res->body(),
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('[WhatsApp] Cloud API request exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Meta's Cloud API expects international format with no '+' and no
     * leading zero (e.g. 966501234567) — our numbers are stored as local
     * (05XXXXXXXX).
     */
    private function toInternationalFormat(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with($digits, '00966')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = '966' . substr($digits, 1);
        } elseif (!str_starts_with($digits, '966')) {
            $digits = '966' . $digits;
        }
        return $digits;
    }
}
