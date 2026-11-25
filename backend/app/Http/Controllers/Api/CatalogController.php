<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandSetting;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    /**
     * GET /api/v2/products  &  GET /api/products
     */
    public function products(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);
        $page    = max((int) $request->query('page', 1), 1);
        $orderby = (string) $request->query('orderby', 'popularity');
        $order   = strtolower((string) $request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = Product::query()
            ->with(['categories', 'tags', 'brand'])
            ->where('status', 'publish');

        // Filter by specific IDs (?include=1,5,9)
        if ($request->filled('include')) {
            $ids = $this->parseIntList((string) $request->query('include'));
            if (empty($ids)) {
                return response()->json([]);
            }
            $query->whereIn('id', $ids);
        }

        // Filter by categories (?category=3,7,12) — includes all nested child/descendant categories automatically
        if ($request->filled('category')) {
            $catIds = $this->expandDescendantCategoryIds(
                $this->parseIntList((string) $request->query('category'))
            );
            if (!empty($catIds)) {
                $query->whereHas('categories', fn ($q) => $q->whereIn('categories.id', $catIds));
            }
        }

        // Filter by tags (?tag=2,4)
        if ($request->filled('tag')) {
            $tagIds = $this->parseIntList((string) $request->query('tag'));
            if (!empty($tagIds)) {
                $query->whereHas('tags', fn ($q) => $q->whereIn('tags.id', $tagIds));
            }
        }

        // Filter by brand (?pwb-brand=nivea or ?brand=nivea or brand ID)
        $brandParam = $request->query('pwb-brand', $request->query('brand'));
        if ($brandParam !== null && $brandParam !== '') {
            $brands = array_values(array_filter(array_map('trim', explode(',', (string) $brandParam))));
            if (!empty($brands)) {
                $query->whereHas('brand', function ($q) use ($brands) {
                    $ids = array_values(array_filter($brands, 'is_numeric'));
                    $slugs = array_values(array_filter($brands, fn ($b) => !is_numeric($b)));
                    $q->where(function ($sub) use ($ids, $slugs) {
                        if (!empty($ids)) {
                            $sub->orWhereIn('brand_settings.id', array_map('intval', $ids));
                        }
                        if (!empty($slugs)) {
                            $sub->orWhereIn('brand_settings.slug', $slugs);
                        }
                    });
                });
            }
        }

        // Search across Arabic/English name, SKU, barcode, short description
        if ($request->filled('search')) {
            $term = trim((string) $request->query('search'));
            if ($term !== '') {
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('name_en', 'like', "%{$term}%")
                        ->orWhere('sku', 'like', "%{$term}%")
                        ->orWhere('barcode', 'like', "%{$term}%")
                        ->orWhere('short_description', 'like', "%{$term}%");
                });
            }
        }

        if ($request->filled('sku')) {
            $query->where('sku', (string) $request->query('sku'));
        }

        if (filter_var($request->query('on_sale'), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('on_sale', true);
        }

        if (filter_var($request->query('featured'), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('featured', true);
        }

        if ($request->filled('min_price') && is_numeric($request->query('min_price'))) {
            $query->where('price', '>=', (float) $request->query('min_price'));
        }

        if ($request->filled('max_price') && is_numeric($request->query('max_price'))) {
            $query->where('price', '<=', (float) $request->query('max_price'));
        }

        if ($request->filled('stock_status')) {
            $query->where('stock_status', (string) $request->query('stock_status'));
        } else {
            // Keep in-stock products ahead of out-of-stock products in general listings
            $query->orderByRaw("CASE WHEN stock_status = 'instock' THEN 0 ELSE 1 END ASC");
        }

        match ($orderby) {
            'price'      => $query->orderBy('price', $order),
            'date'       => $query->orderBy('created_at', $order),
            'sort_order' => $query->orderBy('sort_order', $order)->orderBy('id', 'desc'),
            default      => $query->orderBy('total_sales', $order)->orderBy('sort_order', 'desc')->orderBy('id', 'desc'),
        };

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $items = collect($paginator->items())
            ->map(fn (Product $p) => $p->toApiArray(false))
            ->values()
            ->all();

        return response()->json($items)
            ->header('X-WP-Total', (string) $paginator->total())
            ->header('X-WP-TotalPages', (string) $paginator->lastPage());
    }

    /**
     * GET /api/v2/products/{id}  &  GET /api/products/{id}
     */
    public function product(int $id): JsonResponse
    {
        $product = Product::with(['categories', 'tags', 'brand', 'variations'])
            ->where('status', 'publish')
            ->find($id);

        if (!$product) {
            return response()->json(['message' => 'المنتج غير موجود'], 404);
        }

        return response()->json($product->toApiArray(true));
    }

    /**
     * GET /api/v2/categories  &  GET /api/categories
     */
    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->where('is_active', true)
            ->withCount([
                'products' => fn ($q) => $q->where('status', 'publish'),
            ])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Category $c) => $c->toApiArray((int) $c->products_count))
            ->values()
            ->all();

        return response()->json($categories);
    }

    /**
     * GET /api/v2/category-sections?parent_id=69&per_page=8
     * Returns all non-empty direct subcategories with their preview products in a single request.
     */
    public function categorySections(Request $request): JsonResponse
    {
        $parentId = (int) $request->query('parent_id', 0);
        $limit = min(max((int) $request->query('per_page', 8), 1), 24);

        if ($parentId <= 0) {
            return response()->json([]);
        }

        $children = Category::query()
            ->where('is_active', true)
            ->where('parent_id', $parentId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($children->isEmpty()) {
            return response()->json([]);
        }

        // Map each direct child -> all descendant category IDs (including itself)
        $childDescendantMap = [];
        $allCatIds = [];
        foreach ($children as $child) {
            $desc = $this->expandDescendantCategoryIds([(int) $child->id]);
            $childDescendantMap[$child->id] = array_fill_keys($desc, true);
            foreach ($desc as $dId) {
                $allCatIds[$dId] = true;
            }
        }

        // Fetch all matching published products across the entire parent tree in ONE query
        $products = Product::query()
            ->with(['categories', 'tags', 'brand'])
            ->where('status', 'publish')
            ->whereHas('categories', fn ($q) => $q->whereIn('categories.id', array_keys($allCatIds)))
            ->orderByRaw("CASE WHEN stock_status = 'instock' THEN 0 ELSE 1 END ASC")
            ->orderBy('total_sales', 'desc')
            ->orderBy('sort_order', 'desc')
            ->orderBy('id', 'desc')
            ->limit(max(count($children) * $limit * 2, 120))
            ->get();

        // Pre-serialize each product once so products shared across two subcategories aren't serialized twice
        $serializedById = [];
        foreach ($products as $p) {
            $serializedById[$p->id] = $p->toApiArray(false);
        }

        $sections = [];
        foreach ($children as $child) {
            $allowedCatIds = $childDescendantMap[$child->id];
            $bucket = [];
            foreach ($products as $p) {
                foreach ($p->categories as $pCat) {
                    if (isset($allowedCatIds[$pCat->id])) {
                        $bucket[] = $serializedById[$p->id];
                        break;
                    }
                }
                if (count($bucket) >= $limit) {
                    break;
                }
            }

            if (!empty($bucket)) {
                $sections[] = [
                    'category' => $child->toApiArray(count($bucket)),
                    'products' => $bucket,
                ];
            }
        }

        return response()->json($sections);
    }

    /**
     * GET /api/v2/brands  &  GET /api/brands
     */
    public function brands(): JsonResponse
    {
        $brands = BrandSetting::query()
            ->where('is_active', true)
            ->withCount([
                'products' => fn ($q) => $q->where('status', 'publish'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function (BrandSetting $b) {
                $count = max((int) $b->products_count, (int) $b->product_count);
                return $b->toApiArray($count);
            })
            ->filter(fn (array $b) => $b['count'] > 0)
            ->values()
            ->all();

        return response()->json($brands);
    }

    /**
     * GET /api/v2/coupons/validate?code=SAVE20&subtotal=150&product_ids=1,2
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $code = (string) $request->query('code', '');
        $subtotal = (float) $request->query('subtotal', 0);
        $productIds = $this->parseIntList((string) $request->query('product_ids', ''));

        $result = Coupon::evaluate($code, $subtotal, $productIds);
        if (!$result['valid']) {
            return response()->json([
                'valid'   => false,
                'message' => $result['message'] ?? 'كود الخصم غير صالح',
            ], 422);
        }

        return response()->json($result['data']);
    }

    /**
     * Expands parent category IDs to include all nested child/descendant category IDs.
     *
     * @param  int[]  $seedIds
     * @return int[]
     */
    private function expandDescendantCategoryIds(array $seedIds): array
    {
        if (empty($seedIds)) {
            return [];
        }

        $all = array_fill_keys($seedIds, true);
        $frontier = $seedIds;

        for ($depth = 0; $depth < 6 && !empty($frontier); $depth++) {
            $children = Category::query()
                ->whereIn('parent_id', $frontier)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $frontier = [];
            foreach ($children as $childId) {
                if (!isset($all[$childId])) {
                    $all[$childId] = true;
                    $frontier[] = $childId;
                }
            }
        }

        return array_keys($all);
    }

    /**
     * @return int[]
     */
    private function parseIntList(string $csv): array
    {
        if (trim($csv) === '') {
            return [];
        }

        return array_values(array_unique(array_filter(
            array_map(fn ($v) => (int) trim($v), explode(',', $csv)),
            fn (int $id) => $id > 0
        )));
    }
}
