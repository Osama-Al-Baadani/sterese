<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\WalletTopup;
use App\Services\FcmService;
use App\Services\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function webhook(Request $request)
    {
        $data = $request->all();

        // Logged unconditionally, before anything else can go wrong — the
        // only way to ever know PayMob actually called this endpoint and
        // see the real shape of what it sent, regardless of what happens
        // next (this was previously invisible: nothing logged a webhook
        // call at all until after HMAC verification passed).
        Log::info('PayMob Webhook received', ['ip' => $request->ip(), 'body' => $data]);

        try {
            $hmac = $data['hmac'] ?? null;
            $obj  = $data['obj']  ?? null;

            if (!$hmac || !$obj) {
                return response()->json(['message' => 'بيانات غير صحيحة'], 400);
            }

            if (!$this->verifyHmac($obj, $hmac)) {
                Log::warning('PayMob webhook: HMAC غير صحيح', ['ip' => $request->ip()]);
                return response()->json(['message' => 'توقيع غير صحيح'], 401);
            }

            $paymobOrderId   = (string) ($obj['order']['id'] ?? $obj['order'] ?? null);
            $transactionId   = (string) ($obj['id'] ?? null);
            $success         = (bool)   ($obj['success'] ?? false);
            $pending         = (bool)   ($obj['pending'] ?? false);

            if (!$paymobOrderId) {
                return response()->json(['message' => 'بيانات غير مكتملة'], 400);
            }

            $payment = Payment::where('paymob_order_id', $paymobOrderId)->first();
            if ($payment) {
                return $this->handleOrderPayment($payment, $transactionId, $success, $pending, $obj);
            }

            $topup = WalletTopup::where('paymob_order_id', $paymobOrderId)->first();
            if ($topup) {
                return $this->handleWalletTopup($topup, $transactionId, $success, $pending);
            }

            return response()->json(['message' => 'العملية غير موجودة'], 404);
        } catch (\Throwable $e) {
            // A crash here must never surface as a raw 500 to PayMob — log
            // everything needed to diagnose it and answer cleanly instead.
            Log::error('PayMob webhook: unhandled exception', [
                'message' => $e->getMessage(),
                'body'    => $data,
            ]);
            return response()->json(['message' => 'خطأ داخلي'], 500);
        }
    }

    private function handleOrderPayment(Payment $payment, string $transactionId, bool $success, bool $pending, array $obj)
    {
        // A refund PayMob call always targets a transaction that already
        // succeeded (that's what's being refunded), so it must run before
        // the "already processed" gate below — otherwise it never runs at
        // all. This is what previously left refunds (e.g. for an
        // out-of-stock item, issued manually from PayMob's dashboard)
        // completely silent on our side: the money reached the customer,
        // but nothing here ever noticed the webhook telling us it happened.
        $this->handleRefundIfAny($payment, $obj);

        // Idempotency: only lock once the outcome is final (success/failed) —
        // matches handleWalletTopup below. PayMob can deliver an intermediate
        // 'pending' callback (e.g. for 3D Secure) before the real result;
        // recording paymob_transaction_id on that first call permanently
        // blocked the later, real webhook from ever being processed —
        // silently stranding a genuinely-charged order at 'pending' forever
        // with nothing surfaced anywhere.
        if ($payment->paymob_transaction_id) {
            return response()->json(['message' => 'تم المعالجة مسبقاً']);
        }
        if ($pending) {
            return response()->json(['message' => 'قيد الانتظار']);
        }

        $status = $success ? 'paid' : 'failed';

        $payment->update([
            'paymob_transaction_id' => $transactionId,
            'status'                => $status,
            'paymob_response'       => $obj,
            'error_message'         => !$success
                                        ? ($obj['data']['message'] ?? 'فشل الدفع')
                                        : null,
        ]);

        $order = $payment->order;

        if ($success) {
            $this->debitOrderWallet($order);
            $order->update(['status' => 'paid']);
            $this->syncWooOrderStatus($order, 'processing');
        } else {
            $order->update(['status' => 'failed']);
            $this->syncWooOrderStatus($order, 'failed');
        }

        return response()->json(['message' => 'تم']);
    }

    /**
     * Notifies the customer the moment PayMob reports money actually moved
     * back to them — e.g. a partial refund issued manually from PayMob's
     * dashboard for an item that turned out to be out of stock. PayMob
     * resends the full transaction object on every state change, so
     * `refunded_amount_cents` is always the *cumulative* refunded total,
     * not a delta — tracked against `refunded_amount` on the payment so a
     * repeat webhook for the same refund (PayMob commonly sends more than
     * one) never sends a duplicate notification, and a second, later,
     * larger refund on the same order still notifies for just the new part.
     */
    private function handleRefundIfAny(Payment $payment, array $obj): void
    {
        $refundedAmount = ((int) ($obj['refunded_amount_cents'] ?? 0)) / 100;
        $alreadyKnown   = (float) $payment->refunded_amount;

        if ($refundedAmount <= $alreadyKnown) {
            return;
        }

        $delta = $refundedAmount - $alreadyKnown;
        $payment->update(['refunded_amount' => $refundedAmount]);

        $order = $payment->order;
        if (!$order || !$order->customer_phone) {
            return;
        }

        $fcmToken = DB::table('customer_fcm_tokens')
            ->where('phone', $order->customer_phone)
            ->value('fcm_token');

        if (!$fcmToken) {
            Log::warning('[PaymentController] Refund issued but customer has no FCM token to notify', [
                'order_id' => $order->id,
                'phone'    => $order->customer_phone,
                'amount'   => $delta,
            ]);
            return;
        }

        rescue(fn () => (new FcmService())->sendToDevice(
            $fcmToken,
            '💸 تم استرجاع مبلغ من طلبك',
            "تم استرجاع " . number_format($delta, 2) . " ر.س إلى وسيلة الدفع الخاصة بك من طلب #{$order->woo_order_id}.",
            ['type' => 'refund', 'route' => '/orders', 'order_id' => (string) $order->id],
        ));
    }

    /**
     * Debits the wallet portion of a partial-wallet + card order, now that
     * the card charge is HMAC-verified as actually successful. Previously
     * this was a separate client-triggered call made after the app saw a
     * "paid" result — if that call failed (network drop, timeout, the app
     * being killed), the order stood fully paid/processing in WooCommerce
     * with nothing ever actually debited from the wallet, and nothing
     * anywhere recorded that it happened. Doing it here instead means it
     * only ever runs once, exactly when payment is confirmed, from a
     * source (our own backend) that isn't at the mercy of the customer's
     * connection after checkout.
     */
    private function debitOrderWallet(Order $order): void
    {
        if ((float) $order->wallet_amount <= 0 || !$order->woo_customer_id) {
            return;
        }

        $debited = app(WooCommerceService::class)->debitWalletServerSide(
            (int) $order->woo_customer_id,
            (float) $order->wallet_amount
        );

        if (!$debited) {
            Log::error('[PaymentController] Wallet debit failed for a confirmed card+wallet order', [
                'order_id'    => $order->id,
                'customer_id' => $order->woo_customer_id,
                'amount'      => $order->wallet_amount,
            ]);
        }
    }

    /**
     * Wallet top-ups only ever get credited from here — this is the one
     * place that has independently verified (via HMAC) that PayMob actually
     * received the money. Never add a path that credits a wallet directly
     * from a client-supplied amount.
     */
    private function handleWalletTopup(WalletTopup $topup, string $transactionId, bool $success, bool $pending)
    {
        // Idempotency: only lock once the outcome is final (success/failed),
        // so an earlier 'pending' callback can never block a later real one.
        if ($topup->paymob_transaction_id) {
            return response()->json(['message' => 'تم المعالجة مسبقاً']);
        }
        if ($pending) {
            return response()->json(['message' => 'قيد الانتظار']);
        }

        if ($success) {
            $credited = app(WooCommerceService::class)->creditWalletServerSide(
                (int) $topup->customer_id,
                (float) $topup->amount,
                'شحن المحفظة عبر التطبيق'
            );

            if (!$credited) {
                // Leave status/transaction_id untouched so this remains
                // eligible for a retry/manual reconciliation instead of
                // silently losing a real payment.
                Log::error('Wallet top-up: credit call failed after a paid webhook', [
                    'topup_id' => $topup->id,
                ]);
                return response()->json(['message' => 'فشل الإيداع'], 500);
            }

            $topup->update(['status' => 'paid', 'paymob_transaction_id' => $transactionId]);
        } else {
            $topup->update(['status' => 'failed', 'paymob_transaction_id' => $transactionId]);
        }

        return response()->json(['message' => 'تم']);
    }

    private function verifyHmac(array $obj, string $receivedHmac): bool
    {
        // الحقول التي يستخدمها PayMob لحساب HMAC (بالترتيب الدقيق)
        $fields = [
            'amount_cents', 'created_at', 'currency', 'error_occured',
            'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
            'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
            'is_voided', 'order', 'owner', 'pending',
            'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
        ];

        $concatenated = '';
        foreach ($fields as $field) {
            if ($field === 'order') {
                $value = is_array($obj['order'] ?? null) ? ($obj['order']['id'] ?? '') : ($obj['order'] ?? '');
            } elseif (str_contains($field, '.')) {
                [$parent, $child] = explode('.', $field);
                $value = $obj[$parent][$child] ?? '';
            } else {
                $value = $obj[$field] ?? '';
            }

            if (is_bool($value)) {
                $value = $value ? 'true' : 'false';
            }

            $concatenated .= $value;
        }

        $calculated = hash_hmac('sha512', $concatenated, config('services.paymob.hmac_secret'));

        return hash_equals($calculated, $receivedHmac);
    }

    /**
     * Updates the status of the WooCommerce order created up-front at
     * checkout time (OrderController::createWooOrder). Falls back to
     * creating it here only if it's somehow still missing, so a payment
     * confirmation is never silently lost.
     */
    private function syncWooOrderStatus(Order $order, string $wooStatus): void
    {
        if (!$order->woo_order_id || empty(config('services.woocommerce.url')) || empty(config('services.woocommerce.key'))) {
            return;
        }

        try {
            // See App\Support\OriginHttp — same-server PHP->WooCommerce
            // requests get a flat 403 from this host regardless of the
            // CURLOPT_RESOLVE bypass; shell `curl` is unaffected.
            $response = new \App\Support\OriginHttpResponse(\App\Support\OriginHttp::put(
                config('services.woocommerce.url') . '/wp-json/wc/v3/orders/' . $order->woo_order_id,
                [
                    'status'   => $wooStatus,
                    'set_paid' => $wooStatus === 'processing',
                ],
                basicAuth: [config('services.woocommerce.key'), config('services.woocommerce.secret')],
            ));

            if (!$response->successful()) {
                Log::error('WooCommerce: فشل تحديث حالة الطلب', [
                    'woo_order_id' => $order->woo_order_id,
                    'response'     => $response->body(),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('WooCommerce exception: ' . $e->getMessage());
        }
    }
}
