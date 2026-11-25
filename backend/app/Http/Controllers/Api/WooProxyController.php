<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandSetting;
use App\Support\OriginHttp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WooProxyController extends Controller
{
    // See App\Support\OriginHttp — WooCommerce and this Laravel API share a
    // server; PHP-originated HTTPS requests between them get a flat 403
    // from this host's security layer regardless of the CURLOPT_RESOLVE
    // origin-IP bypass this used to rely on. Shell `curl` is unaffected.
    private function woo(): \App\Support\OriginHttpFluent
    {
        $wooUrl = rtrim(config('services.woocommerce.url'), '/');

        return OriginHttp::fluent()
            ->withBasicAuth(config('services.woocommerce.key'), config('services.woocommerce.secret'))
            ->baseUrl($wooUrl . '/wp-json/wc/v3/')
            ->asJson();
    }

    // GET /api/products
    public function products(Request $request)
    {
        $params = array_filter([
            'per_page'     => $request->query('per_page', 20),
            'page'         => $request->query('page', 1),
            'orderby'      => $request->query('orderby', 'popularity'),
            'order'        => $request->query('order', 'desc'),
            'status'       => 'publish',
            'category'     => $request->query('category'),
            'search'       => $request->query('search'),
            'on_sale'      => $request->query('on_sale'),
            'featured'     => $request->query('featured'),
            'min_price'    => $request->query('min_price'),
            'max_price'    => $request->query('max_price'),
            'stock_status' => $request->query('stock_status'),
            'tag'          => $request->query('tag'),
            'sku'          => $request->query('sku'),
            'pwb-brand'    => $request->query('pwb-brand'),
            'include'      => $request->query('include'),
        ], fn($v) => $v !== null && $v !== '');

        $res = $this->woo()->get('products', $params);

        return response($res->body(), $res->status())
            ->header('Content-Type', 'application/json');
    }

    // GET /api/products/{id}
    public function product(int $id)
    {
        $res = $this->woo()->get("products/{$id}");

        return response($res->body(), $res->status())
            ->header('Content-Type', 'application/json');
    }

    // GET /api/brands
    public function brands(Request $request)
    {
        $settings = BrandSetting::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        // If admin has configured brands, return only active ones (no WooCommerce call needed)
        if ($settings->isNotEmpty()) {
            $brands = $settings->map(fn($s) => [
                'id'    => $s->woo_brand_id ?? $s->id, // fallback to DB id for manually-created brands
                'name'  => $s->name,
                'slug'  => $s->slug,
                'image' => $s->image_url,
                'count' => $s->product_count,
            ])->filter(fn($b) => $b['count'] > 0)->values();

            return response()->json($brands);
        }

        // Fallback: no admin config yet → fetch all from WooCommerce
        $res = $this->woo()->get('pwb-brand', [
            'per_page' => $request->query('per_page', 100),
            'orderby'  => 'name',
            'order'    => 'asc',
        ]);

        if (!$res->successful()) {
            return response()->json([], 200);
        }

        $brands = collect($res->json())->map(fn($b) => [
            'id'    => $b['id'],
            'name'  => $b['name'],
            'slug'  => $b['slug'],
            'image' => $b['pwb_brand_image']['url'] ?? ($b['image']['src'] ?? null),
            'count' => $b['count'] ?? 0,
        ])->filter(fn($b) => $b['count'] > 0)->values();

        return response()->json($brands);
    }

    // GET /api/categories
    public function categories(Request $request)
    {
        $allCategories = [];
        $page = 1;

        do {
            $res = $this->woo()->get('products/categories', [
                'per_page' => 100,
                'page'     => $page,
                'orderby'  => 'id',
                'order'    => 'asc',
            ]);

            if (!$res->successful()) break;

            $data = $res->json();
            $allCategories = array_merge($allCategories, $data);
            $page++;
        } while (count($data) === 100);

        return response()->json($allCategories);
    }
}
