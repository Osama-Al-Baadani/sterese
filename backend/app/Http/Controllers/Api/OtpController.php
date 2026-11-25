<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAuthToken;
use App\Models\PhoneOtp;
use App\Services\SmsService;
use Illuminate\Http\Request;

class OtpController extends Controller
{
    public function send(Request $request)
    {
        $request->validate(['phone' => 'required|string|max:20']);
        $phone = Customer::normalizePhone($request->phone);

        if (!preg_match('/^05\d{8}$/', $phone)) {
            return response()->json(['message' => 'رقم الجوال غير صحيح'], 422);
        }

        $recentCount = PhoneOtp::where('phone', $phone)
            ->where('created_at', '>', now()->subSeconds(60))
            ->count();
        if ($recentCount >= 2) {
            return response()->json(['message' => 'يرجى الانتظار قليلاً قبل طلب رمز جديد'], 429);
        }

        $code = (string) random_int(1000, 9999);

        PhoneOtp::create([
            'phone'      => $phone,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'code'       => $code,
            'expires_at' => now()->addMinutes(5),
        ]);

        app(SmsService::class)->send(
            $phone,
            "Your storeseco verification code is: {$code}"
        );

        return response()->json(['ok' => true]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'phone' => 'required|string|max:20',
            'code'  => 'required|string|max:10',
        ]);
        $phone = Customer::normalizePhone($request->phone);

        $otp = PhoneOtp::where('phone', $phone)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();

        if (!$otp) {
            return response()->json(['message' => 'الرمز منتهي الصلاحية، يرجى طلب رمز جديد'], 422);
        }

        if ($otp->attempts >= 5) {
            return response()->json(['message' => 'محاولات كثيرة جداً، يرجى طلب رمز جديد'], 429);
        }

        if (!hash_equals($otp->code, (string) $request->code)) {
            $otp->increment('attempts');
            return response()->json(['message' => 'رمز التحقق غير صحيح'], 401);
        }

        $customer = Customer::firstOrCreate(
            ['phone' => $phone],
            [
                'first_name' => '',
                'last_name'  => '',
                'email'      => "{$phone}@customers.storeseco.com",
                'is_active'  => true,
            ]
        );

        if (!$customer->is_active) {
            return response()->json(['message' => 'هذا الحساب موقوف، تواصل مع خدمة العملاء'], 403);
        }

        $otp->update(['consumed_at' => now()]);

        $token = CustomerAuthToken::issue($customer->id, $phone);
        $isNew = trim((string) $customer->first_name) === '';

        return response()->json($customer->toApiArray($token, $isNew));
    }
}
