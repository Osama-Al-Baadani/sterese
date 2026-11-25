<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SnapchatConversionsService
{
    private ?string $appId;
    private ?string $accessToken;

    public function __construct()
    {
        $this->appId       = config('services.snapchat.app_id');
        $this->accessToken = config('services.snapchat.access_token');
    }

    public function isConfigured(): bool
    {
        return filled($this->appId) && filled($this->accessToken);
    }

    /**
     * يرسل حدث "شراء" لسناب شات (server-side Conversions API).
     * المطابقة تصير برقم الجوال المُشفّر فقط — ما نجمع معرّف إعلانات الجهاز (IDFA/AAID)
     * حالياً، فجودة المطابقة أقل من تكامل SDK كامل بالتطبيق، لكنها بداية سليمة.
     */
    public function sendPurchase(string $phone, float $value, string $orderId, string $currency = 'SAR'): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $payload = [
            'data' => [[
                'event_name'     => 'PURCHASE',
                'event_time'     => now()->timestamp,
                'event_id'       => 'order_' . $orderId,
                'action_source'  => 'MOBILE_APP',
                'user_data'      => [
                    'ph' => [$this->hashPhone($phone)],
                ],
                'app_data'       => [
                    'advertiser_tracking_enabled' => 0,
                    'app_id'                      => 'sa.storeseco.app',
                    // ترسل من السيرفر بدون جهاز حقيقي — أرقام تقريبية معقولة لأندرويد بدل الفراغ (سناب يرفض OS version فاضية)
                    'extinfo' => ['a2', 'sa.storeseco.app', '1.2.4', '8', '13', 'Generic', 'ar_SA', 'AST', '', 1080, 1920, '2', 8, 64, 32, 'Asia/Riyadh'],
                ],
                'custom_data'    => [
                    'currency'   => $currency,
                    'value'      => $value,
                    'order_id'   => $orderId,
                ],
            ]],
        ];

        $url = "https://tr.snapchat.com/v3/{$this->appId}/events";

        $res = Http::timeout(10)
            ->post($url . '?access_token=' . $this->accessToken, $payload);

        if (!$res->successful()) {
            Log::warning('[Snapchat CAPI] Failed to send purchase event', [
                'order_id' => $orderId,
                'status'   => $res->status(),
                'body'     => $res->body(),
            ]);
            return false;
        }

        return true;
    }

    // سناب شات يتطلب رقم الجوال بصيغة E.164 (+ثم كود الدولة) قبل التشفير SHA256
    private function hashPhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        // أرقام سعودية محلية (05xxxxxxxx) → تتحول لصيغة دولية (9665xxxxxxxx)
        if (str_starts_with($digits, '0')) {
            $digits = '966' . substr($digits, 1);
        } elseif (!str_starts_with($digits, '966') && strlen($digits) === 9) {
            $digits = '966' . $digits;
        }

        return hash('sha256', '+' . $digits);
    }
}
