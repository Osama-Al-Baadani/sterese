<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\SnapchatConversionsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WooWebhookController extends Controller
{
    /**
     * POST /api/webhooks/woocommerce
     * Receives WooCommerce order.created / order.updated webhooks.
     * WooCommerce sends the full order object as JSON.
     */
    public function handle(Request $request)
    {
        // Verify webhook secret if configured
        $secret = config('services.woocommerce.webhook_secret');
        if ($secret) {
            $signature = $request->header('X-WC-Webhook-Signature');
            $expected  = base64_encode(hash_hmac('sha256', $request->getContent(), $secret, true));
            if (!hash_equals($expected, (string) $signature)) {
                Log::warning('WooCommerce webhook signature mismatch');
                return response()->json(['error' => 'Invalid signature'], 401);
            }
        }

        $data = $request->all();

        // Only process order events
        $topic = $request->header('X-WC-Webhook-Topic', '');
        if (!str_starts_with($topic, 'order.')) {
            return response()->json(['ok' => true]);
        }

        $wooId   = $data['id'] ?? null;
        if (!$wooId) {
            return response()->json(['ok' => true]);
        }

        $billing = $data['billing'] ?? [];

        $customerName = trim(
            ($billing['first_name'] ?? '') . ' ' . ($billing['last_name'] ?? '')
        );
        $customerName = $customerName ?: 'غير محدد';

        $city = $billing['city'] ?? '';

        $lineItems = array_map(fn($item) => [
            'id'       => $item['product_id'] ?? $item['id'] ?? 0,
            'name'     => $item['name'] ?? '',
            'quantity' => $item['quantity'] ?? 1,
            'price'    => (float) ($item['price'] ?? 0),
            'sku'      => $item['sku'] ?? '',
            'image'    => $item['image']['src'] ?? '',
        ], $data['line_items'] ?? []);

        $wooStatus = $data['status'] ?? 'pending';
        $localStatus = match ($wooStatus) {
            'processing'  => 'paid',
            'completed'   => 'delivered',
            'on-hold'     => 'pending',
            'pending'     => 'pending',
            'cancelled'   => 'cancelled',
            'refunded'    => 'cancelled',
            'failed'      => 'failed',
            default       => 'pending',
        };

        // This webhook fires on EVERY order.created/order.updated event —
        // including status transitions our own app already triggered (e.g.
        // pending -> processing after payment). For an order our app
        // already tracked (via createOrder/track), those money fields were
        // computed correctly from trusted sources; re-deriving them here
        // from WooCommerce's raw payload every time was actively wrong:
        // 'delivery_fee' used shipping_total (pre-tax, not what the
        // customer paid), 'subtotal' fell back to the grand total when no
        // top-level field existed, and 'wallet_amount' was hardcoded to 0
        // unconditionally — silently wiping a correctly-recorded wallet
        // payment the moment the order's status changed. Only status/
        // customer/items are safe to keep syncing on every event; the
        // money fields are only derived here for an order we're seeing
        // for the first time (e.g. created directly in WordPress admin,
        // never touched createOrder/track at all).
        $existing = Order::where('woo_order_id', (string) $wooId)->first();

        $attrs = [
            'customer_name'  => $customerName,
            'customer_phone' => $billing['phone'] ?? '',
            'customer_email' => $billing['email'] ?? '',
            'address'        => $billing['address_1'] ?? '',
            'city'           => $city,
            'total'          => (float) ($data['total'] ?? 0),
            'tax_amount'     => (float) ($data['total_tax'] ?? 0),
            'status'         => $localStatus,
            'notes'          => $data['customer_note'] ?? '',
            'items'          => $lineItems,
        ];

        if ($existing) {
            $order = tap($existing)->update($attrs);
        } else {
            $subtotal = collect($data['line_items'] ?? [])
                ->sum(fn ($item) => (float) ($item['total'] ?? 0) + (float) ($item['total_tax'] ?? 0));

            // Customer-facing delivery fee = the shipping line's total plus
            // its own tax — shipping_total alone is what we send pre-tax,
            // never what was actually charged.
            $deliveryFee = round(
                (float) ($data['shipping_total'] ?? 0) + (float) ($data['shipping_tax'] ?? 0),
                2
            );

            $walletAmount = 0.0;
            $codFee = 0.0;
            foreach ($data['fee_lines'] ?? [] as $fee) {
                if (($fee['name'] ?? '') === 'دفع بالمحفظة') {
                    $walletAmount = abs((float) ($fee['total'] ?? 0));
                } elseif (($fee['name'] ?? '') === 'رسوم الدفع عند الاستلام') {
                    $codFee = (float) ($fee['total'] ?? 0);
                }
            }

            $order = Order::create($attrs + [
                'woo_order_id'  => (string) $wooId,
                'subtotal'      => $subtotal,
                'delivery_fee'  => $deliveryFee,
                'discount'      => (float) ($data['discount_total'] ?? 0),
                'wallet_amount' => $walletAmount,
                'cod_fee'       => $codFee,
            ]);
        }

        // إرسال حدث "شراء" لسناب شات مرة واحدة فقط، أول ما الطلب يصير مدفوع/مكتمل
        if (in_array($localStatus, ['paid', 'delivered']) && !$order->snapchat_purchase_sent) {
            $sent = app(SnapchatConversionsService::class)->sendPurchase(
                phone: $order->customer_phone,
                value: (float) $order->total,
                orderId: (string) $wooId,
            );
            if ($sent) {
                $order->update(['snapchat_purchase_sent' => true]);
            }
        }

        return response()->json(['ok' => true]);
    }
}
