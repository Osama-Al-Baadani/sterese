<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesCustomer;
use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    use AuthorizesCustomer;

    /**
     * POST /api/paymob-orders/create
     * Native order creation supporting both Card (PayMob Unified Checkout) & COD.
     */
    public function create(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_name'    => 'required|string|max:255',
            'customer_phone'   => 'required|string|max:30',
            'customer_email'   => 'nullable|email|max:255',
            'address'          => 'required|string|max:500',
            'city'             => 'required|string|max:100',
            'delivery_fee'     => 'required|numeric|min:0|max:200',
            'wallet_amount'    => 'nullable|numeric|min:0',
            'coupon_code'      => 'nullable|string|max:50',
            'payment_method'   => 'nullable|string|in:card,cod',
            'source'           => 'nullable|string|max:30',
            'return_url_base'  => 'nullable|url|max:500',
            'notes'            => 'nullable|string|max:1000',
            'delivery_type'    => 'nullable|string|max:100',
            'lat'              => 'nullable|numeric',
            'lng'              => 'nullable|numeric',
            'woo_customer_id'  => 'nullable|integer',
            'idempotency_key'  => 'nullable|string|max:64',
            'meta_data'        => 'nullable|array',
            'items'            => 'required|array|min:1',
            'items.*.id'       => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $idempotencyKey = $request->input('idempotency_key');
        if ($idempotencyKey) {
            $existing = Order::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $this->respondForExistingOrder($existing, $request->input('return_url_base'));
            }
        }

        $settings = AppSetting::current();
        $paymentMethod = $request->input('payment_method', 'card') === 'cod' ? 'cod' : 'card';

        if ($paymentMethod === 'cod' && !$settings->cod_enabled) {
            return response()->json(['message' => 'الدفع عند الاستلام غير متاح حالياً'], 422);
        }

        $productIds = collect($request->items)->pluck('id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        $products = Product::whereIn('id', $productIds)
            ->where('status', 'publish')
            ->get()
            ->keyBy('id');

        $subtotal = 0.0;
        $enrichedItems = [];
        foreach ($request->items as $reqItem) {
            $pid = (int) $reqItem['id'];
            $qty = (int) $reqItem['quantity'];
            /** @var Product|null $product */
            $product = $products->get($pid);

            if (!$product || $product->stock_status === 'outofstock') {
                return response()->json(['message' => 'أحد المنتجات في سلتك لم يعد متوفراً حالياً'], 422);
            }

            if ($product->manage_stock && $product->stock_quantity !== null && $product->stock_quantity < $qty) {
                return response()->json([
                    'message' => "الكمية المطلوبة من «{$product->name}» تتجاوز المتوفر ({$product->stock_quantity})",
                ], 422);
            }

            $unitPrice = (float) $product->price;
            $subtotal += $unitPrice * $qty;

            $enrichedItems[] = [
                'id'         => $product->id,
                'name'       => $product->name,
                'sku'        => $product->sku,
                'image'      => $product->primary_image_url,
                'quantity'   => $qty,
                'price'      => $unitPrice,
                'bundle_qty' => $product->bundle_qty,
            ];
        }

        if ($settings->min_order_value > 0 && $subtotal < (float) $settings->min_order_value) {
            return response()->json([
                'message' => 'الحد الأدنى للطلب هو ' . number_format((float) $settings->min_order_value, 2) . ' ر.س',
            ], 422);
        }

        $deliveryFee = (float) $request->delivery_fee;
        $discount = 0.0;
        $appliedCouponModel = null;

        if ($request->filled('coupon_code')) {
            $couponEval = Coupon::evaluate((string) $request->coupon_code, $subtotal, $productIds);
            if ($couponEval['valid']) {
                $discount = (float) $couponEval['data']['discount_amount'];
                if (!empty($couponEval['data']['free_shipping'])) {
                    $deliveryFee = 0.0;
                }
                $appliedCouponModel = $couponEval['coupon'] ?? null;
            }
        }

        $codFee = ($paymentMethod === 'cod' && $settings->cod_fee_enabled)
            ? (float) $settings->cod_fee_amount
            : 0.0;

        $storeService = app(WooCommerceService::class);
        $verifiedCustomerId = $this->verifiedCustomerId($request, $request->input('woo_customer_id'));
        $walletAmount = 0.0;
        if ($request->filled('wallet_amount') && $verifiedCustomerId) {
            $requested = (float) $request->wallet_amount;
            $realBalance = $storeService->getRealWalletBalance($verifiedCustomerId);
            $walletAmount = max(0.0, min($requested, $realBalance, $subtotal + $deliveryFee + $codFee - $discount));
        }

        $total = max(0.0, round($subtotal + $deliveryFee + $codFee - $discount - $walletAmount, 2));
        $taxAmount = round($subtotal * 15 / 115, 2);

        $gps = ($request->filled('lat') && $request->filled('lng'))
            ? $request->lat . ',' . $request->lng
            : null;

        $metaLookup = collect($request->input('meta_data', []))
            ->mapWithKeys(fn ($m) => [($m['key'] ?? '') => $m['value'] ?? null]);

        $initialStatus = $paymentMethod === 'cod'
            ? 'cod'
            : ($total <= 0 ? 'paid' : 'pending');

        $order = DB::transaction(function () use (
            $idempotencyKey,
            $request,
            $subtotal,
            $deliveryFee,
            $discount,
            $walletAmount,
            $codFee,
            $verifiedCustomerId,
            $gps,
            $total,
            $taxAmount,
            $initialStatus,
            $paymentMethod,
            $enrichedItems,
            $metaLookup,
            $appliedCouponModel,
            $products,
            $storeService
        ) {
            // Immediate wallet debit only when no external card charge is pending;
            // for card + partial wallet orders, PaymentController debits upon HMAC webhook success.
            if ($walletAmount > 0 && $verifiedCustomerId && ($paymentMethod === 'cod' || $total <= 0)) {
                if (!$storeService->debitWalletServerSide($verifiedCustomerId, $walletAmount)) {
                    abort(response()->json(['message' => 'رصيد المحفظة غير كافٍ'], 422));
                }
            }

            if ($appliedCouponModel) {
                $appliedCouponModel->increment('usage_count');
            }

            foreach ($enrichedItems as $item) {
                /** @var Product|null $p */
                $p = $products->get($item['id']);
                if ($p) {
                    $p->increment('total_sales', $item['quantity']);
                    if ($p->manage_stock && $p->stock_quantity !== null) {
                        $newQty = max(0, $p->stock_quantity - $item['quantity']);
                        $p->update([
                            'stock_quantity' => $newQty,
                            'stock_status'   => $newQty > 0 ? 'instock' : 'outofstock',
                        ]);
                    }
                }
            }

            return Order::create([
                'idempotency_key'          => $idempotencyKey,
                'customer_name'            => $request->customer_name,
                'customer_phone'           => $request->customer_phone,
                'customer_email'           => $request->customer_email,
                'address'                  => $request->address,
                'city'                     => $request->city,
                'subtotal'                 => $subtotal,
                'delivery_fee'             => $deliveryFee,
                'discount'                 => $discount,
                'wallet_amount'            => $walletAmount,
                'cod_fee'                  => $codFee,
                'woo_customer_id'          => $verifiedCustomerId ?? $request->woo_customer_id,
                'delivery_type'            => $request->delivery_type,
                'gps_coordinates'          => $gps,
                'total'                    => $total,
                'tax_amount'               => $taxAmount,
                'status'                   => $initialStatus,
                'delivery_status'          => 'pending',
                'payment_method'           => $paymentMethod,
                'source'                   => $request->input('source', 'app'),
                'notes'                    => $request->notes,
                'items'                    => $enrichedItems,
                'attribution_source'       => $metaLookup->get('_wc_order_attribution_utm_source'),
                'attribution_media_source' => $metaLookup->get('_af_media_source'),
                'attribution_campaign'     => $metaLookup->get('_af_campaign'),
            ]);
        });

        if ($paymentMethod === 'cod' || $total <= 0) {
            return response()->json([
                'order_id'       => $order->id,
                'access_key'     => $order->access_key,
                'payment_method' => $paymentMethod === 'cod' ? 'cod' : 'wallet',
                'status'         => $order->status,
            ]);
        }

        $intention = $this->createPaymobIntention($order, $request->input('return_url_base'));
        if (!$intention) {
            $order->update(['status' => 'failed']);
            return response()->json(['message' => 'فشل التواصل مع بوابة الدفع'], 500);
        }

        return response()->json([
            'order_id'      => $order->id,
            'access_key'    => $order->access_key,
            'client_secret' => $intention['client_secret'],
            'public_key'    => config('services.paymob.public_key'),
            'amount'        => $intention['amount_cents'],
        ]);
    }

    /**
     * GET /api/paymob-orders?phone=05xxxxxxxx
     * Customer order history (used by Next.js /account/orders and app).
     */
    public function customerOrders(Request $request)
    {
        $phone = $request->query('phone');
        if (!$phone) {
            return response()->json(['message' => 'phone required'], 422);
        }

        $this->authorizeCustomerPhone($request, $phone);

        $digits = preg_replace('/\D/', '', $phone);
        $core = preg_replace('/^(00966|966|0)/', '', $digits);
        $variants = array_unique(["0{$core}", "+966{$core}", "966{$core}", $core]);

        $orders = Order::query()
            ->where(function ($q) use ($variants) {
                foreach ($variants as $v) {
                    $q->orWhere('customer_phone', 'like', "%{$v}");
                }
            })
            ->where(function ($q) {
                // Exclude abandoned card payment attempts that were never completed
                $q->where('payment_method', '!=', 'card')
                    ->orWhereNotIn('status', ['pending', 'failed']);
            })
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (Order $o) => $this->formatOrder($o))
            ->values();

        return response()->json($orders);
    }

    /**
     * GET /api/paymob-orders/{id}?key=...
     */
    public function show(Request $request, $orderId)
    {
        $order = Order::find($orderId);
        if (!$order) {
            return response()->json(['message' => 'الطلب غير موجود'], 404);
        }

        $providedKey = (string) $request->query('key', '');
        if (!empty($order->access_key) && ($providedKey === '' || !hash_equals($order->access_key, $providedKey))) {
            return response()->json(['message' => 'غير مصرح بعرض هذا الطلب'], 403);
        }

        return response()->json($this->formatOrder($order));
    }

    /**
     * GET /api/paymob-orders/{id}/status?key=...
     */
    public function status(Request $request, $orderId)
    {
        $order = Order::with('payment')->find($orderId);
        if (!$order) {
            return response()->json(['message' => 'الطلب غير موجود'], 404);
        }

        $providedKey = (string) $request->query('key', '');
        if ($order->source === 'web' && !empty($order->access_key) && ($providedKey === '' || !hash_equals($order->access_key, $providedKey))) {
            return response()->json(['message' => 'غير مصرح بعرض حالة الطلب'], 403);
        }

        return response()->json([
            'order_id'     => $order->id,
            'status'       => $order->status,
            'woo_order_id' => $order->woo_order_id,
        ]);
    }

    /**
     * GET /api/delivery-eligibility?phone=05xxxxxxxx
     */
    public function deliveryEligibility(Request $request)
    {
        $phone = (string) $request->query('phone', '');
        if (trim($phone) === '') {
            return response()->json(['message' => 'phone required'], 422);
        }

        return response()->json(['eligible' => false]);
    }

    public function track(Request $request)
    {
        return response()->json(['message' => 'Deprecated WooCommerce endpoint'], 410);
    }

    /**
     * POST /api/orders/public-track
     * Allows a customer to track an order by order_number (id) + customer phone.
     */
    public function publicTrack(Request $request)
    {
        $orderNumber = trim((string) $request->input('order_number', ''));
        $phone = trim((string) $request->input('phone', ''));

        if ($orderNumber === '' || $phone === '') {
            return response()->json(['message' => 'رقم الطلب ورقم الجوال مطلوبان'], 422);
        }

        $digits = preg_replace('/\D/', '', $phone);
        $core = preg_replace('/^(00966|966|0)/', '', $digits);
        if (strlen($core) < 7) {
            return response()->json(['message' => 'رقم الجوال غير صحيح'], 422);
        }

        $orderId = (int) ltrim($orderNumber, '#');
        $variants = array_unique(["0{$core}", "+966{$core}", "966{$core}", $core]);

        $order = Order::query()
            ->where('id', $orderId)
            ->where(function ($q) use ($variants) {
                foreach ($variants as $v) {
                    $q->orWhere('customer_phone', 'like', "%{$v}");
                }
            })
            ->first();

        if (!$order) {
            return response()->json(['message' => 'لم يتم العثور على طلب مطابق لهذه البيانات'], 404);
        }

        return response()->json($this->formatOrder($order));
    }

    public function markPaid(Request $request, $wooOrderId)
    {
        return response()->json(['message' => 'Deprecated WooCommerce endpoint'], 410);
    }

    private function formatOrder(Order $o): array
    {
        return [
            'id'              => $o->id,
            'order_number'    => $o->id,
            'status'          => $o->status,
            'delivery_status' => $o->delivery_status,
            'customer_name'   => $o->customer_name,
            'customer_phone'  => $o->customer_phone,
            'address'         => $o->address,
            'city'            => $o->city,
            'subtotal'        => (float) $o->subtotal,
            'delivery_fee'    => (float) $o->delivery_fee,
            'cod_fee'         => (float) $o->cod_fee,
            'discount'        => (float) $o->discount,
            'total'           => (float) $o->total,
            'payment_method'  => $o->payment_method,
            'notes'           => $o->notes,
            'items'           => $o->items ?? [],
            'created_at'      => $o->created_at?->toIso8601String(),
        ];
    }

    private function respondForExistingOrder(Order $order, ?string $returnUrlBase = null)
    {
        if ($order->status !== 'pending') {
            return response()->json([
                'order_id'       => $order->id,
                'access_key'     => $order->access_key,
                'payment_method' => $order->payment_method,
                'status'         => $order->status,
            ]);
        }

        $intention = $this->createPaymobIntention($order, $returnUrlBase);
        if (!$intention) {
            return response()->json(['message' => 'فشل التواصل مع بوابة الدفع'], 500);
        }

        return response()->json([
            'order_id'      => $order->id,
            'access_key'    => $order->access_key,
            'client_secret' => $intention['client_secret'],
            'public_key'    => config('services.paymob.public_key'),
            'amount'        => $intention['amount_cents'],
        ]);
    }

    private function createPaymobIntention(Order $order, ?string $returnUrlBase = null): ?array
    {
        $amountCents = (int) round((float) $order->total * 100);

        $payload = [
            'amount'          => $amountCents,
            'currency'        => config('services.paymob.currency', 'SAR'),
            'payment_methods' => [(int) config('services.paymob.card_integration_id')],
            'items'           => [[
                'name'        => 'طلب #' . $order->id,
                'amount'      => $amountCents,
                'description' => 'طلب شراء من المخازن الاقتصادية',
                'quantity'    => 1,
            ]],
            'billing_data' => [
                'apartment'    => 'NA',
                'floor'        => 'NA',
                'building'     => 'NA',
                'postal_code'  => 'NA',
                'last_name'    => 'NA',
                'state'        => 'NA',
                'first_name'   => $order->customer_name,
                'street'       => $order->address,
                'email'        => $order->customer_email ?? "{$order->customer_phone}@customers.storeseco.com",
                'phone_number' => $order->customer_phone,
                'city'         => $order->city,
                'country'      => 'SAU',
            ],
            'customer' => [
                'first_name'   => $order->customer_name,
                'last_name'    => 'NA',
                'email'        => $order->customer_email ?? "{$order->customer_phone}@customers.storeseco.com",
                'phone_number' => $order->customer_phone,
            ],
            'extras' => ['internal_order_id' => (string) $order->id],
        ];

        if ($returnUrlBase) {
            $payload['redirection_url'] = rtrim($returnUrlBase, '/') . "/{$order->id}/{$order->access_key}";
        }

        $intentionRes = Http::timeout(30)
            ->withHeaders(['Authorization' => 'Token ' . config('services.paymob.secret_key')])
            ->post('https://ksa.paymob.com/v1/intention/', $payload);

        if (!$intentionRes->successful()) {
            Log::error('PayMob intention failed', ['body' => $intentionRes->body()]);
            return null;
        }

        $clientSecret  = $intentionRes->json()['client_secret'];
        $paymobOrderId = (string) ($intentionRes->json()['intention_order_id'] ?? '');

        Payment::create([
            'order_id'        => $order->id,
            'paymob_order_id' => $paymobOrderId,
            'status'          => 'pending',
            'payment_method'  => 'card',
            'amount'          => $order->total,
            'currency'        => config('services.paymob.currency', 'SAR'),
            'paymob_response' => ['client_secret_prefix' => substr($clientSecret, 0, 20)],
        ]);

        return ['client_secret' => $clientSecret, 'amount_cents' => $amountCents];
    }
}
