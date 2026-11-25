<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Sends via Connect Saudi's REST Query API once account credentials are
     * configured (CONNECTSAUDI_USER / CONNECTSAUDI_API_KEY or
     * CONNECTSAUDI_PASSWORD / CONNECTSAUDI_SENDER_ID in .env). Until those
     * arrive, falls back to just logging the message so the OTP flow keeps
     * working end-to-end for testing (see the PhoneOtp list in Filament).
     */
    public function send(string $phone, string $message): bool
    {
        $user     = config('services.connectsaudi.user');
        $apiKey   = config('services.connectsaudi.api_key');
        $password = config('services.connectsaudi.password');
        $senderId = config('services.connectsaudi.sender_id');

        if (!$user || !$senderId || (!$apiKey && !$password)) {
            Log::info('[SMS] (stub — Connect Saudi credentials not configured yet)', [
                'phone'   => $phone,
                'message' => $message,
            ]);
            return true;
        }

        try {
            // Connect Saudi has been observed hanging well past 10s with no
            // response — this call sits inside otp/send's request cycle, so
            // a slow gateway meant the customer's whole request ran long
            // enough for this host's edge layer to give up and hand back
            // its own HTML timeout page instead of Laravel's JSON response
            // (surfaced in the app as a JSON-parse crash on the OTP
            // screen). A short timeout here keeps the overall request fast
            // regardless of the gateway's state — a slow/down gateway now
            // just means this one SMS doesn't send (already true either
            // way), not that the whole login flow breaks.
            $res = Http::timeout(4)->get('https://sms.connectsaudi.com/sendurl.aspx', [
                'user'        => $user,
                'pwd'         => $password ?: 'unused', // ignored by Connect Saudi when `key` is provided
                'key'         => $apiKey ?: '',
                'senderid'    => $senderId,
                'mobileno'    => $this->toInternationalFormat($phone),
                'msgtext'     => $message,
                'CountryCode' => 'ALL',
                'ShowError'   => 'C',
            ]);

            $body    = trim($res->body());
            $success = $res->successful() && str_starts_with($body, '000');

            if (!$success) {
                Log::warning('[SMS] Connect Saudi send failed', [
                    'phone'    => $phone,
                    'response' => $body,
                ]);
            }

            return $success;
        } catch (\Throwable $e) {
            Log::error('[SMS] Connect Saudi request exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Connect Saudi requires international format with no '+' and no
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
