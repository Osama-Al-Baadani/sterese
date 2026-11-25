<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesCustomer;
use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\CustomerAuthToken;
use App\Models\Order;
use App\Models\Product;
use App\Models\WelcomeOfferClaim;
use App\Services\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    use AuthorizesCustomer;

    // POST /api/auth/login
    public function login(Request $request)
    {
        $request->validate([
            'phone'    => 'required|string',
            'password' => 'required|string',
        ]);

        $phone = Customer::normalizePhone($request->phone);
        $customer = Customer::where('phone', $phone)->where('is_active', true)->first();

        if (!$customer || empty($customer->password) || !Hash::check($request->password, $customer->password)) {
            return response()->json(['message' => 'رقم الجوال أو كلمة المرور غير صحيحة'], 401);
        }

        $token = CustomerAuthToken::issue($customer->id, $customer->phone);
        return response()->json($customer->toApiArray($token));
    }

    // GET /api/customers/find?phone=05xxxxxxxx
    public function findByPhone(Request $request)
    {
        $phone = $request->query('phone');
        if (!$phone) {
            return response()->json(['message' => 'phone required'], 422);
        }

        $normalized = Customer::normalizePhone($phone);
        $core = preg_replace('/^0/', '', $normalized);
        $variants = ["0{$core}", "+966{$core}", "966{$core}", $core];

        $hasOrders = Order::whereIn('status', ['paid', 'cod', 'shipped', 'delivered', 'confirmed'])
            ->where(function ($q) use ($variants) {
                foreach ($variants as $v) {
                    $q->orWhere('customer_phone', 'like', "%{$v}");
                }
            })->exists();

        $customer = Customer::where('phone', $normalized)->first();
        if ($customer) {
            $data = $customer->toApiArray();
            $data['has_previous_orders'] = $hasOrders;
            return response()->json($data);
        }

        if ($hasOrders) {
            return response()->json(['has_previous_orders' => true]);
        }

        return response()->json(null);
    }

    // POST /api/customers
    public function createCustomer(Request $request)
    {
        $request->validate([
            'phone'      => 'required|string|max:30',
            'first_name' => 'nullable|string|max:150',
            'last_name'  => 'nullable|string|max:150',
            'email'      => 'nullable|email|max:255',
            'password'   => 'nullable|string|min:6|max:100',
        ]);

        $phone = Customer::normalizePhone($request->phone);
        if (Customer::where('phone', $phone)->exists()) {
            return response()->json(['message' => 'رقم الجوال مسجل مسبقاً'], 409);
        }

        $customer = Customer::create([
            'phone'      => $phone,
            'first_name' => (string) $request->input('first_name', $request->input('billing.first_name', '')),
            'last_name'  => (string) $request->input('last_name', $request->input('billing.last_name', '')),
            'email'      => $request->input('email') ?: "{$phone}@customers.storeseco.com",
            'password'   => $request->input('password'),
            'is_active'  => true,
        ]);

        $token = CustomerAuthToken::issue($customer->id, $phone);
        return response()->json($customer->toApiArray($token, empty($customer->first_name)), 201);
    }

    // PUT /api/customers/{id}
    public function updateCustomer(Request $request, int $id)
    {
        $this->authorizeCustomerLenient($request, $id);

        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['message' => 'العميل غير موجود'], 404);
        }

        $updates = [];
        if ($request->has('first_name')) {
            $updates['first_name'] = (string) $request->input('first_name');
        } elseif ($request->has('billing.first_name')) {
            $updates['first_name'] = (string) $request->input('billing.first_name');
        }

        if ($request->has('last_name')) {
            $updates['last_name'] = (string) $request->input('last_name');
        }
        if ($request->filled('email')) {
            $updates['email'] = (string) $request->input('email');
        }

        if (!empty($updates)) {
            $customer->update($updates);
        }

        return response()->json($customer->fresh()->toApiArray());
    }

    // GET /api/customers/{id}
    public function getCustomer(Request $request, int $id)
    {
        $this->authorizeCustomerLenient($request, $id);

        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['message' => 'العميل غير موجود'], 404);
        }

        return response()->json($customer->toApiArray());
    }

    // GET /api/wallet/{id}
    public function walletBalance(Request $request, int $id)
    {
        $this->authorizeCustomer($request, $id);

        $customer = Customer::find($id);
        return response()->json([
            'customer_id' => $id,
            'balance'     => $customer ? (float) $customer->wallet_balance : 0.0,
            'currency'    => 'SAR',
        ]);
    }

    // POST /api/wallet/{id}/credit (server-verified topups are handled via WalletTopupController + PayMob webhook)
    public function walletCredit(Request $request, int $id)
    {
        $this->authorizeCustomer($request, $id);
        return response()->json(['message' => 'يرجى استخدام بوابة شحن المحفظة المباشرة'], 422);
    }

    // POST /api/wallet/{id}/debit
    public function walletDebit(Request $request, int $id)
    {
        $this->authorizeCustomer($request, $id);
        return response()->json(['message' => 'يتم خصم المحفظة تلقائياً عند إنشاء الطلب'], 422);
    }

    // POST /api/fcm-token
    public function saveFcmToken(Request $request)
    {
        $request->validate([
            'phone'     => 'required|string|max:30',
            'fcm_token' => 'nullable|string|max:500',
            'token'     => 'nullable|string|max:500',
        ]);

        $fcmToken = $request->input('fcm_token') ?: $request->input('token');
        if (!$fcmToken) {
            return response()->json(['message' => 'fcm_token required'], 422);
        }

        $phone = Customer::normalizePhone($request->phone);

        DB::table('customer_fcm_tokens')->updateOrInsert(
            ['phone' => $phone],
            [
                'fcm_token'  => $fcmToken,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json(['ok' => true]);
    }

    // POST /api/orders (native COD / Wallet checkout for legacy app route)
    public function createOrder(Request $request)
    {
        $lineItems = $request->input('line_items', []);
        if (empty($lineItems) || !is_array($lineItems)) {
            return response()->json(['message' => 'السلة فارغة'], 422);
        }

        $productIds = collect($lineItems)->pluck('product_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        $products = Product::whereIn('id', $productIds)->where('status', 'publish')->get()->keyBy('id');

        $subtotal = 0.0;
        $items = [];
        foreach ($lineItems as $li) {
            $pid = (int) ($li['product_id'] ?? 0);
            $qty = max(1, (int) ($li['quantity'] ?? 1));
            $product = $products->get($pid);
            if (!$product || $product->stock_status === 'outofstock') {
                return response()->json(['message' => 'أحد المنتجات غير متوفر حالياً'], 422);
            }
            $price = (float) $product->price;
            $subtotal += $price * $qty;
            $items[] = [
                'id'         => $product->id,
                'name'       => $product->name,
                'sku'        => $product->sku,
                'image'      => $product->primary_image_url,
                'quantity'   => $qty,
                'price'      => $price,
                'bundle_qty' => $product->bundle_qty,
            ];
        }

        $settings = AppSetting::current();
        $deliveryFee = (float) ($request->input('shipping_lines.0.total', $settings->delivery_fee));
        $discount = 0.0;
        $couponCode = $request->input('coupon_lines.0.code');
        $appliedCoupon = null;

        if ($couponCode) {
            $eval = Coupon::evaluate((string) $couponCode, $subtotal, $productIds);
            if ($eval['valid']) {
                $discount = (float) $eval['data']['discount_amount'];
                if (!empty($eval['data']['free_shipping'])) {
                    $deliveryFee = 0.0;
                }
                $appliedCoupon = $eval['coupon'] ?? null;
            }
        }

        $paymentMethod = $request->input('payment_method', 'cod');
        $codFee = ($paymentMethod === 'cod' && $settings->cod_fee_enabled) ? (float) $settings->cod_fee_amount : 0.0;

        $customerId = $this->verifiedCustomerId($request, $request->input('customer_id'));
        $walletAmount = 0.0;
        $storeService = app(WooCommerceService::class);
        if ($customerId && $request->filled('wallet_amount')) {
            $realBal = $storeService->getRealWalletBalance($customerId);
            $walletAmount = max(0.0, min((float) $request->wallet_amount, $realBal, $subtotal + $deliveryFee + $codFee - $discount));
        }

        $total = max(0.0, round($subtotal + $deliveryFee + $codFee - $discount - $walletAmount, 2));
        $taxAmount = round($subtotal * 15 / 115, 2);

        $order = DB::transaction(function () use (
            $request,
            $subtotal,
            $deliveryFee,
            $discount,
            $walletAmount,
            $codFee,
            $customerId,
            $total,
            $taxAmount,
            $paymentMethod,
            $items,
            $appliedCoupon,
            $storeService
        ) {
            if ($walletAmount > 0 && $customerId) {
                if (!$storeService->debitWalletServerSide($customerId, $walletAmount)) {
                    abort(response()->json(['message' => 'تعذر الخصم من المحفظة'], 422));
                }
            }
            if ($appliedCoupon) {
                $appliedCoupon->increment('usage_count');
            }

            return Order::create([
                'idempotency_key' => $request->input('idempotency_key'),
                'customer_name'   => (string) $request->input('billing.first_name', 'عميل'),
                'customer_phone'  => (string) $request->input('billing.phone', ''),
                'customer_email'  => $request->input('billing.email'),
                'address'         => (string) $request->input('billing.address_1', ''),
                'city'            => (string) $request->input('billing.city', ''),
                'subtotal'        => $subtotal,
                'delivery_fee'    => $deliveryFee,
                'discount'        => $discount,
                'wallet_amount'   => $walletAmount,
                'cod_fee'         => $codFee,
                'woo_customer_id' => $customerId,
                'total'           => $total,
                'tax_amount'      => $taxAmount,
                'status'          => $paymentMethod === 'cod' ? 'cod' : ($total <= 0 ? 'paid' : 'pending'),
                'delivery_status' => 'pending',
                'payment_method'  => $paymentMethod,
                'source'          => 'app',
                'notes'           => $request->input('customer_note'),
                'items'           => $items,
            ]);
        });

        return response()->json([
            'id'         => $order->id,
            'number'     => (string) $order->id,
            'status'     => $order->status === 'cod' || $order->status === 'paid' ? 'processing' : 'pending',
            'total'      => (string) $order->total,
            'line_items' => $items,
        ], 201);
    }

    // GET /api/orders?customer=xxx
    public function getOrders(Request $request)
    {
        $customerId = $request->query('customer');
        if ($customerId) {
            $this->authorizeCustomerLenient($request, (int) $customerId);
        }

        $query = Order::query()->orderByDesc('id');
        if ($customerId) {
            $customer = Customer::find((int) $customerId);
            $query->where(function ($q) use ($customerId, $customer) {
                $q->where('woo_customer_id', (int) $customerId);
                if ($customer && $customer->phone) {
                    $q->orWhere('customer_phone', $customer->phone);
                }
            });
        }

        $orders = $query->limit(50)->get()->map(fn (Order $o) => [
            'id'              => $o->id,
            'number'          => (string) $o->id,
            'order_number'    => $o->id,
            'status'          => $o->status,
            'delivery_status' => $o->delivery_status,
            'total'           => (string) $o->total,
            'date_created'    => $o->created_at?->toIso8601String(),
            'created_at'      => $o->created_at?->toIso8601String(),
            'payment_method'  => $o->payment_method,
            'items'           => $o->items ?? [],
            'line_items'      => $o->items ?? [],
        ])->values();

        return response()->json($orders);
    }

    // GET /api/coupons?code=xxx
    public function validateCoupon(Request $request)
    {
        $code = (string) $request->query('code', '');
        if ($code === '') {
            return response()->json(['message' => 'code required'], 422);
        }

        $subtotal = (float) $request->query('subtotal', 0);
        $woo = app(WooCommerceService::class);
        $coupon = $woo->validateCoupon($code, $subtotal);

        return response()->json($coupon ? [$coupon] : [], 200);
    }

    // GET /api/welcome-offer
    public function welcomeOffer()
    {
        $s = AppSetting::current();
        if (!$s->welcome_offer_active) {
            return response()->json(['active' => false]);
        }
        return response()->json([
            'active'            => true,
            'type'              => $s->welcome_offer_type,
            'discount_percent'  => $s->welcome_offer_discount_percent,
            'discount_amount'   => $s->welcome_offer_discount_amount,
            'min_order'         => $s->welcome_offer_discount_min_order,
            'expiry_days'       => $s->welcome_offer_expiry_days,
            'gift_product_id'   => $s->welcome_offer_gift_product_id,
            'gift_product_name' => $s->welcome_offer_gift_product_name,
            'gift_image'        => $s->welcome_offer_gift_image,
        ]);
    }

    // POST /api/welcome-offer/generate-coupon
    public function generateWelcomeCoupon(Request $request)
    {
        $s = AppSetting::current();
        if (!$s->welcome_offer_active || !in_array($s->welcome_offer_type, ['discount', 'fixed_discount'], true)) {
            return response()->json(['message' => 'offer not active'], 422);
        }

        $request->validate(['phone' => 'required|string|max:20']);
        $digits = Customer::normalizePhone($request->phone);

        if ($existing = WelcomeOfferClaim::where('phone', $digits)->first()) {
            return response()->json([
                'message' => 'تم استخدام عرض الترحيب مسبقاً لهذا الرقم',
                'code'    => $existing->coupon_code,
            ], 409);
        }

        $isFixed = $s->welcome_offer_type === 'fixed_discount';
        $code = 'WELCOME-' . strtoupper(Str::random(8));
        $expiresAt = now()->addDays((int) ($s->welcome_offer_expiry_days ?: 3));
        $amount = (float) ($isFixed ? $s->welcome_offer_discount_amount : $s->welcome_offer_discount_percent);

        try {
            DB::transaction(function () use ($digits, $code, $isFixed, $amount, $s, $expiresAt) {
                WelcomeOfferClaim::create(['phone' => $digits, 'coupon_code' => $code]);

                Coupon::create([
                    'code'           => $code,
                    'description'    => 'كوبون عرض الترحيب لرقم ' . $digits,
                    'type'           => $isFixed ? 'fixed' : 'percent',
                    'amount'         => $amount,
                    'minimum_amount' => (float) $s->welcome_offer_discount_min_order,
                    'usage_limit'    => 1,
                    'expires_at'     => $expiresAt,
                    'is_active'      => true,
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            $existing = WelcomeOfferClaim::where('phone', $digits)->first();
            return response()->json([
                'message' => 'تم استخدام عرض الترحيب مسبقاً لهذا الرقم',
                'code'    => $existing->coupon_code ?? null,
            ], 409);
        }

        return response()->json([
            'code'          => $code,
            'discount_type' => $isFixed ? 'fixed_cart' : 'percent',
            'amount'        => $amount,
            'expires_at'    => $expiresAt->format('Y-m-d'),
            'min_order'     => $s->welcome_offer_discount_min_order,
        ]);
    }
}
