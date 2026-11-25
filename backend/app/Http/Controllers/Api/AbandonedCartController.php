<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AbandonedCart;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class AbandonedCartController extends Controller
{
    // Save or update abandoned cart (upsert by phone)
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => 'nullable|string|max:120',
            'phone'        => 'required|string|max:20',
            'cart_items'   => 'required|array',
            'total'        => 'required|numeric|min:0',
        ]);

        AbandonedCart::updateOrCreate(
            ['phone' => $data['phone']],
            [
                'name'       => $data['name'] ?? '',
                'cart_items' => $data['cart_items'],
                'total'      => $data['total'],
                'status'     => AbandonedCart::STATUS_NEW,
                // Every save is a fresh abandonment moment — restart the
                // 30-minute reminder clock rather than reusing whatever was
                // already sent for an earlier, possibly very different cart.
                'reminded_at' => null,
            ]
        );

        return response()->json(['success' => true]);
    }

    // Delete abandoned cart when order is completed
    public function destroy(string $phone): JsonResponse
    {
        AbandonedCart::where('phone', $phone)->delete();

        return response()->json(['success' => true]);
    }

    // Convert abandoned cart to a WooCommerce order (called from Filament)
    public function convertToOrder(Request $request, AbandonedCart $cart): JsonResponse
    {
        $data = $request->validate([
            'payment_method' => 'required|in:cod,bank_transfer',
            'address'        => 'nullable|string|max:500',
            'city'           => 'nullable|string|max:100',
            'notes'          => 'nullable|string|max:1000',
        ]);

        $items = is_array($cart->cart_items) ? $cart->cart_items : json_decode($cart->cart_items, true);

        $lineItems = collect($items)->map(fn($i) => [
            'product_id' => $i['product_id'] ?? $i['id'] ?? 0,
            'quantity'   => $i['qty'] ?? $i['quantity'] ?? 1,
        ])->filter(fn($i) => $i['product_id'] > 0)->values()->toArray();

        if (empty($lineItems)) {
            return response()->json(['error' => 'لا توجد منتجات صالحة'], 422);
        }

        $paymentTitle = $data['payment_method'] === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي';

        $body = [
            'status'               => 'pending',
            'payment_method'       => $data['payment_method'],
            'payment_method_title' => $paymentTitle,
            'set_paid'             => false,
            'billing'  => [
                'first_name' => $cart->name ?: 'عميل',
                'phone'      => $cart->phone,
                'address_1'  => $data['address'] ?? 'يحدد لاحقاً',
                'city'       => $data['city'] ?? 'الرياض',
                'state'      => 'SA',
                'country'    => 'SA',
            ],
            'line_items'    => $lineItems,
            'customer_note' => 'طلب محوّل من سلة مهجورة'
                . ($data['notes'] ? ' — ' . $data['notes'] : ''),
            'meta_data' => [
                ['key' => '_source', 'value' => 'abandoned_cart_recovery'],
            ],
        ];

        $wooKey    = config('services.woocommerce.key');
        $wooSecret = config('services.woocommerce.secret');
        $wooUrl    = rtrim(config('services.woocommerce.url'), '/');

        // See App\Support\OriginHttp — same-server PHP->WooCommerce
        // requests get a flat 403 from this host; shell `curl` is
        // unaffected, which is what this now goes through.
        $response = new \App\Support\OriginHttpResponse(\App\Support\OriginHttp::post(
            "{$wooUrl}/wp-json/wc/v3/orders",
            $body,
            basicAuth: [$wooKey, $wooSecret],
            timeout: 20,
        ));

        if (!$response->successful()) {
            return response()->json(['error' => 'فشل إنشاء الطلب في WooCommerce', 'details' => $response->json()], 500);
        }

        $wooOrderId = $response->json('id');

        $cart->update([
            'status'       => AbandonedCart::STATUS_CONVERTED,
            'woo_order_id' => $wooOrderId,
        ]);

        return response()->json([
            'success'      => true,
            'woo_order_id' => $wooOrderId,
        ]);
    }

    // Update status (contacted / lost)
    public function updateStatus(Request $request, AbandonedCart $cart): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:new,contacted,converted,lost',
        ]);

        $updates = ['status' => $data['status']];
        if ($data['status'] === AbandonedCart::STATUS_CONTACTED) {
            $updates['contacted_at'] = now();
        }

        $cart->update($updates);

        return response()->json(['success' => true]);
    }
}
