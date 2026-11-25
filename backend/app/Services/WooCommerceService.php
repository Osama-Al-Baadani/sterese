<?php

namespace App\Services;

use App\Models\BrandSetting;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Tag;

/**
 * Local catalog/store service replacing external WooCommerce HTTP calls.
 * Retains the exact class & method signatures so existing callers (webhooks,
 * admin widgets, legacy endpoints) work 100% natively against Laravel's DB.
 */
class WooCommerceService
{
    public function getCustomerContact(int $customerId): array
    {
        $customer = Customer::find($customerId);
        if (!$customer) {
            return ['name' => 'Customer', 'phone' => ''];
        }

        $name = trim($customer->first_name . ' ' . $customer->last_name);
        return [
            'name'  => $name !== '' ? $name : 'Customer',
            'phone' => $customer->phone ?? '',
        ];
    }

    public function searchCategories(string $search, int $perPage = 30): array
    {
        return Category::query()
            ->withCount('products')
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%"))
            ->limit($perPage)
            ->get()
            ->mapWithKeys(fn (Category $c) => [
                (string) $c->id => "{$c->name} — {$c->products_count} منتج",
            ])
            ->toArray();
    }

    public function getCategoryLabels(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return Category::whereIn('id', $ids)
            ->pluck('name', 'id')
            ->mapWithKeys(fn ($name, $id) => [(string) $id => $name])
            ->toArray();
    }

    public function searchTags(string $search, int $perPage = 30): array
    {
        return Tag::query()
            ->withCount('products')
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%"))
            ->limit($perPage)
            ->get()
            ->mapWithKeys(fn (Tag $t) => [
                (string) $t->id => "{$t->name} — {$t->products_count} منتج",
            ])
            ->toArray();
    }

    public function getTagLabels(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return Tag::whereIn('id', $ids)
            ->pluck('name', 'id')
            ->mapWithKeys(fn ($name, $id) => [(string) $id => $name])
            ->toArray();
    }

    public function searchBrands(string $search, int $perPage = 30): array
    {
        return BrandSetting::query()
            ->withCount('products')
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('slug', 'like', "%{$search}%"))
            ->limit($perPage)
            ->get()
            ->mapWithKeys(fn (BrandSetting $b) => [
                (string) $b->slug => "{$b->name} — {$b->products_count} منتج",
            ])
            ->toArray();
    }

    public function getBrandLabels(array $slugs): array
    {
        if (empty($slugs)) {
            return [];
        }

        return BrandSetting::whereIn('slug', $slugs)
            ->pluck('name', 'slug')
            ->toArray();
    }

    public function searchProducts(string $search, int $perPage = 30): array
    {
        return Product::query()
            ->where('status', 'publish')
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%"))
            ->limit($perPage)
            ->pluck('name', 'id')
            ->mapWithKeys(fn ($name, $id) => [(string) $id => $name])
            ->toArray();
    }

    public function getProductLabels(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return Product::whereIn('id', $ids)
            ->pluck('name', 'id')
            ->mapWithKeys(fn ($name, $id) => [(string) $id => $name])
            ->toArray();
    }

    /**
     * Returns verified server-side prices keyed by product ID.
     *
     * @param  int[]  $ids
     * @return array<int, float>
     */
    public function getProductsPricing(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return Product::query()
            ->whereIn('id', $ids)
            ->where('status', 'publish')
            ->where('stock_status', '!=', 'outofstock')
            ->get()
            ->mapWithKeys(fn (Product $p) => [(int) $p->id => (float) $p->price])
            ->toArray();
    }

    public function getOrder(int $id): ?array
    {
        $order = Order::find($id);
        return $order ? $order->toArray() : null;
    }

    public function updateOrderCustomer(int $orderId, int $customerId): void
    {
        Order::where('id', $orderId)->update(['woo_customer_id' => $customerId]);
    }

    public function getRealWalletBalance(int $customerId): float
    {
        $customer = Customer::find($customerId);
        return $customer ? (float) $customer->wallet_balance : 0.0;
    }

    public function creditWalletServerSide(int $customerId, float $amount, string $note = ''): bool
    {
        if ($amount <= 0) {
            return false;
        }

        $customer = Customer::find($customerId);
        if (!$customer) {
            return false;
        }

        $customer->increment('wallet_balance', $amount);
        return true;
    }

    public function debitWalletServerSide(int $customerId, float $amount): bool
    {
        if ($amount <= 0) {
            return true;
        }

        $affected = Customer::where('id', $customerId)
            ->where('wallet_balance', '>=', $amount)
            ->decrement('wallet_balance', $amount);

        return $affected > 0;
    }

    public function validateCoupon(string $code, float $subtotal = 0.0, array $productIds = []): ?array
    {
        $eval = Coupon::evaluate($code, $subtotal, $productIds);
        if (!$eval['valid']) {
            return null;
        }

        $data = $eval['data'];
        return [
            'code'          => $data['code'],
            'description'   => $data['description'],
            'discount_type' => $data['type'] === 'percent' ? 'percent' : 'fixed_cart',
            'type'          => $data['type'],
            'amount'        => (string) $data['amount'],
            'free_shipping' => $data['free_shipping'],
            'discount_amount' => $data['discount_amount'],
        ];
    }

    public function fetchOrders(int $page = 1, int $perPage = 100): array
    {
        return Order::orderByDesc('id')
            ->forPage($page, $perPage)
            ->get()
            ->toArray();
    }

    public function fetchAllOrders(int $maxPages = 20): array
    {
        return Order::orderByDesc('id')
            ->limit($maxPages * 100)
            ->get()
            ->toArray();
    }
}
