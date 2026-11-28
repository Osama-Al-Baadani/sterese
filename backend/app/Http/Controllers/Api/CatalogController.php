<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandSetting;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    /**
     * Slim column list for product cards / carousels — skips LONGTEXT
     * description & description_en so MySQL I/O and JSON payloads stay tiny.
     */
    private const LISTING_COLUMNS = [
        'products.id',
        'products.brand_setting_id',
        'products.name',
        'products.name_en',
        'products.slug',
        'products.sku',
        'products.barcode',
        'products.unit',
        'products.bundle_qty',
        'products.type',
        'products.status',
        'products.featured',
        'products.short_description',
        'products.short_description_en',
        'products.price',
        'products.regular_price',
        'products.sale_price',
        'products.on_sale',
        'products.stock_status',
        'products.stock_quantity',
        'products.manage_stock',
        'products.average_rating',
        'products.rating_count',
        'products.total_sales',
        'products.sort_order',
        'products.images',
        'products.related_product_ids',
        'products.created_at',
    ];

    private function cacheVersion(): string
    {
        return \App\Support\StorefrontCache::version();
    }

    /**
     * Base eager-loaded listing query.
     */
    private function baseListingQuery(): Builder
    {
        return Product::query()
            ->select(self::LISTING_COLUMNS)
            ->with([
                'categories:id,name,name_en,slug',
                'tags:id,name,name_en,slug',
                'brand',
                'variations',
            ])
            ->where('products.status', 'publish');
    }

    /**
     * GET /api/v2/storefront-init
     * Single unified, cached bootstrap payload for Next.js (AppConfig + Categories +
     * Brands + HomeDepartments + HomeSections with resolved products).
     * Eliminates 12-15 sequential/parallel HTTP round-trips on page refresh.
     */
    public function storefrontInit(): JsonResponse
    {
        $ver = $this->cacheVersion();

        $payload = Cache::remember("api_v2_storefront_init:{$ver}", 180, function () {
            $appConfig = app(AppConfigController::class)->index()->getData(true);
            $categories = $this->computeCategories();
            $brands = $this->computeBrands();
            $departmentsData = app(HomeDepartmentController::class)->index()->getData(true);
            $sectionsData = app(HomeSectionController::class)->index()->getData(true);

            $rawSections = $sectionsData['sections'] ?? [];
            $sectionsWithProducts = [];

            foreach ($rawSections as $sec) {
                $products = $this->resolveHomeSectionProducts($sec);
                $sectionsWithProducts[] = [
                    'section'  => $sec,
                    'products' => $products,
                ];
            }

            // Fallback when no curated home sections have products: one row per non-empty root category
            $hasAnyProducts = collect($sectionsWithProducts)->contains(fn ($s) => !empty($s['products']));
            if (!$hasAnyProducts) {
                $sectionsWithProducts = [];
                foreach ($categories as $cat) {
                    if (($cat['parent'] ?? 0) !== 0) {
                        continue;
                    }
                    $catId = (int) $cat['id'];
                    $fallbackSec = [
                        'id'              => -$catId,
                        'title'           => $cat['name'],
                        'icon'            => '',
                        'source_type'     => 'category',
                        'source_id'       => $catId,
                        'source_ids'      => [$catId],
                        'product_ids'     => [],
                        'products_limit'  => 12,
                        'banner_url'      => '',
                        'banner_link'     => '',
                        'banner_url_web'  => '',
                        'banner_link_web' => '',
                        'banners'         => [],
                        'banners_web'     => [],
                    ];
                    $products = $this->resolveHomeSectionProducts($fallbackSec);
                    if (!empty($products)) {
                        $sectionsWithProducts[] = [
                            'section'  => $fallbackSec,
                            'products' => $products,
                        ];
                    }
                }
            }

            return [
                'version'              => $ver,
                'appConfig'            => $appConfig,
                'categories'           => $categories,
                'brands'               => $brands,
                'departments'          => $departmentsData['departments'] ?? [],
                'sectionsWithProducts' => $sectionsWithProducts,
            ];
        });

        return response()->json($payload);
    }

    private function resolveHomeSectionProducts(array $section): array
    {
        $limit = min(max((int) ($section['products_limit'] ?? 12), 1), 40);
        $productIds = array_values(array_filter(array_map('intval', $section['product_ids'] ?? []), fn ($id) => $id > 0));

        $query = $this->baseListingQuery()->where('products.stock_status', 'instock');

        if (!empty($productIds)) {
            $query->whereIn('products.id', $productIds);
        } else {
            $sourceType = (string) ($section['source_type'] ?? '');
            $sourceIds = array_values(array_filter(array_map('intval', $section['source_ids'] ?? []), fn ($id) => $id > 0));

            switch ($sourceType) {
                case 'category':
                    if (empty($sourceIds)) {
                        return [];
                    }
                    $catIds = $this->expandDescendantCategoryIds($sourceIds);
                    $query->whereExists(function ($q) use ($catIds) {
                        $q->select(DB::raw(1))
                            ->from('product_category')
                            ->whereColumn('product_category.product_id', 'products.id')
                            ->whereIn('product_category.category_id', $catIds);
                    });
                    break;

                case 'tag':
                    if (empty($sourceIds)) {
                        return [];
                    }
                    $query->whereExists(function ($q) use ($sourceIds) {
                        $q->select(DB::raw(1))
                            ->from('product_tag')
                            ->whereColumn('product_tag.product_id', 'products.id')
                            ->whereIn('product_tag.tag_id', $sourceIds);
                    });
                    break;

                case 'bestsellers':
                    break;

                case 'featured':
                    $query->where('products.featured', true);
                    break;

                default:
                    return [];
            }
        }

        return $query
            ->orderBy('products.total_sales', 'desc')
            ->orderBy('products.sort_order', 'desc')
            ->orderBy('products.id', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn (Product $p) => $p->toApiArray(false))
            ->values()
            ->all();
    }

    /**
     * GET /api/v2/products  &  GET /api/products
     */
    public function products(Request $request): JsonResponse
    {
        $hasSearch = $request->filled('search');
        $ver = $this->cacheVersion();

        $compute = function () use ($request): array {
            $perPage = min(max((int) $request->query('per_page', 20), 1), 100);
            $page    = max((int) $request->query('page', 1), 1);
            $orderby = (string) $request->query('orderby', 'popularity');
            $order   = strtolower((string) $request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';

            $query = $this->baseListingQuery();

            // Filter by specific IDs (?include=1,5,9)
            if ($request->filled('include')) {
                $ids = $this->parseIntList((string) $request->query('include'));
                if (empty($ids)) {
                    return [];
                }
                $query->whereIn('products.id', $ids);
            }

            // Filter by categories (?category=3,7,12) — direct pivot lookup (no extra join)
            if ($request->filled('category')) {
                $catIds = $this->expandDescendantCategoryIds(
                    $this->parseIntList((string) $request->query('category'))
                );
                if (!empty($catIds)) {
                    $query->whereExists(function ($q) use ($catIds) {
                        $q->select(DB::raw(1))
                            ->from('product_category')
                            ->whereColumn('product_category.product_id', 'products.id')
                            ->whereIn('product_category.category_id', $catIds);
                    });
                }
            }

            // Filter by tags (?tag=2,4) — direct pivot lookup
            if ($request->filled('tag')) {
                $tagIds = $this->parseIntList((string) $request->query('tag'));
                if (!empty($tagIds)) {
                    $query->whereExists(function ($q) use ($tagIds) {
                        $q->select(DB::raw(1))
                            ->from('product_tag')
                            ->whereColumn('product_tag.product_id', 'products.id')
                            ->whereIn('product_tag.tag_id', $tagIds);
                    });
                }
            }

            // Filter by brand (?pwb-brand=nivea or ?brand=nivea or brand ID)
            $brandParam = $request->query('pwb-brand', $request->query('brand'));
            if ($brandParam !== null && $brandParam !== '') {
                $brands = array_values(array_filter(array_map('trim', explode(',', (string) $brandParam))));
                if (!empty($brands)) {
                    $ids = array_values(array_filter($brands, 'is_numeric'));
                    $slugs = array_values(array_filter($brands, fn ($b) => !is_numeric($b)));
                    $matchedBrandIds = BrandSetting::query()
                        ->where(function ($sub) use ($ids, $slugs) {
                            if (!empty($ids)) {
                                $sub->orWhereIn('id', array_map('intval', $ids));
                            }
                            if (!empty($slugs)) {
                                $sub->orWhereIn('slug', $slugs);
                            }
                        })
                        ->pluck('id')
                        ->all();

                    if (empty($matchedBrandIds)) {
                        return [];
                    }
                    $query->whereIn('products.brand_setting_id', $matchedBrandIds);
                }
            }

            // Search across Arabic/English name, SKU, barcode, descriptions, and category names
            if ($request->filled('search')) {
                $term = trim((string) $request->query('search'));
                if ($term !== '') {
                    $query->where(function ($q) use ($term) {
                        $q->where('products.name', 'like', "%{$term}%")
                            ->orWhere('products.name_en', 'like', "%{$term}%")
                            ->orWhere('products.sku', 'like', "%{$term}%")
                            ->orWhere('products.barcode', 'like', "%{$term}%")
                            ->orWhere('products.short_description', 'like', "%{$term}%")
                            ->orWhere('products.short_description_en', 'like', "%{$term}%")
                            ->orWhereHas('categories', fn ($cq) => $cq
                                ->where('categories.name', 'like', "%{$term}%")
                                ->where('categories.name_en', 'like', "%{$term}%"));
                    });
                }
            }

            if ($request->filled('sku')) {
                $query->where('products.sku', (string) $request->query('sku'));
            }

            if (filter_var($request->query('on_sale'), FILTER_VALIDATE_BOOLEAN)) {
                $query->where('products.on_sale', true);
            }

            if (filter_var($request->query('featured'), FILTER_VALIDATE_BOOLEAN)) {
                $query->where('products.featured', true);
            }

            if ($request->filled('min_price') && is_numeric($request->query('min_price'))) {
                $query->where('products.price', '>=', (float) $request->query('min_price'));
            }

            if ($request->filled('max_price') && is_numeric($request->query('max_price'))) {
                $query->where('products.price', '<=', (float) $request->query('max_price'));
            }

            if ($request->filled('stock_status')) {
                $query->where('products.stock_status', (string) $request->query('stock_status'));
            } else {
                $query->orderByRaw("CASE WHEN products.stock_status = 'instock' THEN 0 ELSE 1 END ASC");
            }

            match ($orderby) {
                'price'      => $query->orderBy('products.price', $order),
                'date'       => $query->orderBy('products.created_at', $order),
                'sort_order' => $query->orderBy('products.sort_order', $order)->orderBy('products.id', 'desc'),
                default      => $query->orderBy('products.total_sales', $order)->orderBy('products.sort_order', 'desc')->orderBy('products.id', 'desc'),
            };

            return $query
                ->forPage($page, $perPage)
                ->get()
                ->map(fn (Product $p) => $p->toApiArray(false))
                ->values()
                ->all();
        };

        if ($hasSearch) {
            return response()->json($compute());
        }

        $queryParams = $request->query();
        ksort($queryParams);
        $cacheKey = "api_v2_products:{$ver}:" . md5(http_build_query($queryParams));

        $items = Cache::remember($cacheKey, 180, $compute);

        return response()->json($items);
    }

    /**
     * GET /api/v2/products/{id}  &  GET /api/products/{id}
     */
    public function product(int $id): JsonResponse
    {
        $ver = $this->cacheVersion();

        $payload = Cache::remember("api_v2_product:{$ver}:{$id}", 180, function () use ($id) {
            $product = Product::with(['categories:id,name,name_en,slug', 'tags:id,name,name_en,slug', 'brand', 'variations'])
                ->where('status', 'publish')
                ->find($id);

            return $product ? $product->toApiArray(true) : null;
        });

        if (!$payload) {
            return response()->json(['message' => 'المنتج غير موجود'], 404);
        }

        return response()->json($payload);
    }

    /**
     * GET /api/v2/categories  &  GET /api/categories
     */
    public function categories(): JsonResponse
    {
        return response()->json($this->computeCategories());
    }

    private function computeCategories(): array
    {
        $ver = $this->cacheVersion();

        return Cache::remember("api_v2_categories:{$ver}", 300, function () {
            return Category::query()
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
        });
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

        $ver = $this->cacheVersion();

        $sections = Cache::remember("api_v2_category_sections:{$ver}:{$parentId}:{$limit}", 180, function () use ($parentId, $limit) {
            $children = Category::query()
                ->where('is_active', true)
                ->where('parent_id', $parentId)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get();

            if ($children->isEmpty()) {
                return [];
            }

            $childDescendantMap = [];
            $allCatIds = [];
            foreach ($children as $child) {
                $desc = $this->expandDescendantCategoryIds([(int) $child->id]);
                $childDescendantMap[$child->id] = array_fill_keys($desc, true);
                foreach ($desc as $dId) {
                    $allCatIds[$dId] = true;
                }
            }

            $catIdList = array_keys($allCatIds);

            $products = $this->baseListingQuery()
                ->whereExists(function ($q) use ($catIdList) {
                    $q->select(DB::raw(1))
                        ->from('product_category')
                        ->whereColumn('product_category.product_id', 'products.id')
                        ->whereIn('product_category.category_id', $catIdList);
                })
                ->orderByRaw("CASE WHEN products.stock_status = 'instock' THEN 0 ELSE 1 END ASC")
                ->orderBy('products.total_sales', 'desc')
                ->orderBy('products.sort_order', 'desc')
                ->orderBy('products.id', 'desc')
                ->limit(max(count($children) * $limit * 2, 120))
                ->get();

            $serializedById = [];
            foreach ($products as $p) {
                $serializedById[$p->id] = $p->toApiArray(false);
            }

            $result = [];
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
                    $result[] = [
                        'category' => $child->toApiArray(count($bucket)),
                        'products' => $bucket,
                    ];
                }
            }

            return $result;
        });

        return response()->json($sections);
    }

    /**
     * GET /api/v2/brands  &  GET /api/brands
     */
    public function brands(): JsonResponse
    {
        return response()->json($this->computeBrands());
    }

    private function computeBrands(): array
    {
        $ver = $this->cacheVersion();

        return Cache::remember("api_v2_brands:{$ver}", 300, function () {
            return BrandSetting::query()
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
        });
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
     * Expands parent category IDs in-memory using a cached parent->children index
     * (zero per-request SQL queries).
     *
     * @param  int[]  $seedIds
     * @return int[]
     */
    private function expandDescendantCategoryIds(array $seedIds): array
    {
        if (empty($seedIds)) {
            return [];
        }

        $ver = $this->cacheVersion();
        $childrenByParent = Cache::remember("api_cat_children_map:{$ver}", 600, function () {
            $rows = Category::query()->select(['id', 'parent_id'])->get();
            $map = [];
            foreach ($rows as $r) {
                $pid = (int) ($r->parent_id ?? 0);
                if ($pid > 0) {
                    $map[$pid][] = (int) $r->id;
                }
            }
            return $map;
        });

        $all = array_fill_keys($seedIds, true);
        $frontier = $seedIds;

        for ($depth = 0; $depth < 8 && !empty($frontier); $depth++) {
            $nextFrontier = [];
            foreach ($frontier as $parentId) {
                foreach ($childrenByParent[$parentId] ?? [] as $childId) {
                    if (!isset($all[$childId])) {
                        $all[$childId] = true;
                        $nextFrontier[] = $childId;
                    }
                }
            }
            $frontier = $nextFrontier;
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
