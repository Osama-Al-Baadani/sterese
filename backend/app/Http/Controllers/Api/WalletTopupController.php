<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesCustomer;
use App\Http\Controllers\Controller;
use App\Models\WalletTopup;
use App\Services\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class WalletTopupController extends Controller
{
    use AuthorizesCustomer;

    /**
     * POST /api/wallet-topups/create
     *
     * Creates a PayMob intention for a wallet top-up. The amount is credited
     * to the wallet ONLY once PaymentController::webhook() independently
     * verifies (via PayMob's HMAC-signed callback) that this exact intention
     * was actually paid — never from anything the client reports back.
     */
    public function create(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer',
            'amount'      => 'required|numeric|min:10|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $customerId = (int) $request->customer_id;
        $this->authorizeCustomer($request, $customerId);

        $amount      = round((float) $request->amount, 2);
        $amountCents = (int) round($amount * 100);

        // A placeholder 'NA' phone number here (this whole function's state
        // until now) meant PayMob had no real phone to run its own
        // Mada/3-D Secure verification against — recent wallet top-ups were
        // stuck 'pending' at a ~90% rate with zero webhook ever received,
        // consistent with PayMob's own checkout silently failing before a
        // real charge attempt, never with the app's order-payment flow
        // (which always sent the real phone and doesn't show this pattern).
        $contact = app(WooCommerceService::class)->getCustomerContact($customerId);
        $nameParts = explode(' ', $contact['name'], 2);

        $intentionRes = Http::timeout(30)
            ->withHeaders(['Authorization' => 'Token ' . config('services.paymob.secret_key')])
            ->post('https://ksa.paymob.com/v1/intention/', [
                'amount'          => $amountCents,
                'currency'        => config('services.paymob.currency', 'SAR'),
                'payment_methods' => [(int) config('services.paymob.card_integration_id')],
                'items'           => [[
                    'name'        => 'شحن المحفظة',
                    'amount'      => $amountCents,
                    'description' => 'شحن محفظة رقمية - المخازن الاقتصادية',
                    'quantity'    => 1,
                ]],
                'billing_data' => [
                    'apartment'    => 'NA', 'floor' => 'NA', 'building' => 'NA',
                    'postal_code'  => 'NA', 'last_name' => $nameParts[1] ?? 'NA', 'state' => 'NA',
                    'first_name'   => $nameParts[0],
                    'street'       => 'NA',
                    'email'        => "customer{$customerId}@customers.storeseco.com",
                    'phone_number' => $contact['phone'] !== '' ? $contact['phone'] : 'NA',
                    'city'         => 'NA',
                    'country'      => 'SAU',
                ],
                'extras' => ['wallet_customer_id' => (string) $customerId],
            ]);

        if (!$intentionRes->successful()) {
            Log::error('Wallet top-up: PayMob intention failed', ['body' => $intentionRes->body()]);
            return response()->json(['message' => 'فشل التواصل مع بوابة الدفع'], 500);
        }

        $clientSecret  = $intentionRes->json()['client_secret'];
        $paymobOrderId = (string) ($intentionRes->json()['intention_order_id'] ?? '');

        $topup = WalletTopup::create([
            'customer_id'     => $customerId,
            'amount'          => $amount,
            'status'          => 'pending',
            'source'          => 'paymob_intention',
            'paymob_order_id' => $paymobOrderId,
        ]);

        return response()->json([
            'topup_id'      => $topup->id,
            'client_secret' => $clientSecret,
            'public_key'    => config('services.paymob.public_key'),
            'amount'        => $amountCents,
        ]);
    }

    // GET /api/wallet-topups/{id}/status
    public function status(Request $request, int $id)
    {
        $topup = WalletTopup::find($id);
        if (!$topup) {
            return response()->json(['message' => 'غير موجود'], 404);
        }

        $this->authorizeCustomer($request, $topup->customer_id);

        return response()->json([
            'status'     => $topup->status,
            'new_balance' => $topup->status === 'paid'
                ? app(\App\Services\WooCommerceService::class)->getRealWalletBalance($topup->customer_id)
                : null,
        ]);
    }
}
