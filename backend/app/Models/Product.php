<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Product extends Model
{
    protected $fillable = [
        'brand_setting_id',
        'name',
        'name_en',
        'slug',
        'sku',
        'barcode',
        'unit',
        'bundle_qty',
        'type',
        'status',
        'published_at',
        'featured',
        'short_description',
        'short_description_en',
        'description',
        'description_en',
        'price',
        'regular_price',
        'sale_price',
        'cost_price',
        'on_sale',
        'stock_status',
        'stock_quantity',
        'security_stock',
        'manage_stock',
        'backorder',
        'requires_shipping',
        'weight_value',
        'weight_unit',
        'height_value',
        'width_value',
        'depth_value',
        'dimension_unit',
        'average_rating',
        'rating_count',
        'total_sales',
        'sort_order',
        'images',
        'related_product_ids',
        'woo_product_id',
    ];

    protected $casts = [
        'brand_setting_id'    => 'integer',
        'bundle_qty'          => 'integer',
        'published_at'        => 'date',
        'featured'            => 'boolean',
        'price'               => 'decimal:2',
        'regular_price'       => 'decimal:2',
        'sale_price'          => 'decimal:2',
        'cost_price'          => 'decimal:2',
        'on_sale'             => 'boolean',
        'stock_quantity'      => 'integer',
        'security_stock'      => 'integer',
        'manage_stock'        => 'boolean',
        'backorder'           => 'boolean',
        'requires_shipping'   => 'boolean',
        'weight_value'        => 'decimal:2',
        'height_value'        => 'decimal:2',
        'width_value'         => 'decimal:2',
        'depth_value'         => 'decimal:2',
        'average_rating'      => 'decimal:2',
        'rating_count'        => 'integer',
        'total_sales'         => 'integer',
        'sort_order'          => 'integer',
        'images'              => 'array',
        'related_product_ids' => 'array',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $product) {
            $rawSlug = trim((string) ($product->slug ?: ($product->name_en ?: $product->name)));
            $product->slug = static::uniqueSlug($rawSlug, $product->exists ? $product->id : null);

            $regular = (float) ($product->regular_price ?? 0);
            $sale = $product->sale_price !== null && $product->sale_price !== '' ? (float) $product->sale_price : null;

            if ($sale !== null && $sale > 0 && ($regular <= 0 || $sale < $regular)) {
                $product->on_sale = true;
                $product->price = $sale;
                if ($regular <= 0) {
                    $product->regular_price = $sale;
                }
            } else {
                $product->on_sale = false;
                $product->sale_price = null;
                $product->price = $regular;
            }

            if ($product->manage_stock && $product->stock_quantity !== null) {
                $product->stock_status = $product->stock_quantity > 0 ? 'instock' : 'outofstock';
            }

            if (!$product->manage_stock) {
                $product->stock_status = $product->stock_status ?: 'instock';
            }
        });

        static::saved(fn () => \App\Support\StorefrontCache::bump());
        static::deleted(fn () => \App\Support\StorefrontCache::bump());
    }

    public static function uniqueSlug(string $raw, ?int $ignoreId = null): string
    {
        $base = trim((string) preg_replace('/[^\p{Arabic}a-z0-9]+/iu', '-', mb_strtolower($raw)), '-');
        if ($base === '') {
            $base = 'product-' . Str::lower(Str::random(6));
        }

        $slug = $base;
        $counter = 2;
        while (
            static::where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(BrandSetting::class, 'brand_setting_id');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'product_category');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'product_tag');
    }

    public function variations(): HasMany
    {
        return $this->hasMany(ProductVariation::class)->orderBy('sort_order');
    }

    public function qtyLimit(): HasOne
    {
        return $this->hasOne(ProductQtyLimit::class, 'woo_product_id', 'id');
    }

    public function getPrimaryImageUrlAttribute(): ?string
    {
        $urls = $this->resolvedImageUrls();
        return $urls[0] ?? null;
    }

    /**
     * @return string[]
     */
    public function resolvedImageUrls(): array
    {
        $rawImages = $this->images ?? [];
        if (!is_array($rawImages)) {
            return [];
        }

        $urls = [];
        foreach ($rawImages as $entry) {
            $src = is_array($entry) ? ($entry['src'] ?? $entry['url'] ?? null) : $entry;
            if (!is_string($src) || trim($src) === '') {
                continue;
            }
            $src = trim($src);
            if (str_starts_with($src, 'http://') || str_starts_with($src, 'https://')) {
                $urls[] = $src;
            } else {
                $urls[] = Storage::disk('public')->url($src);
            }
        }

        return $urls;
    }

    public function toApiArray(bool $includeVariations = false): array
    {
        $images = array_map(fn (string $url) => ['src' => $url], $this->resolvedImageUrls());

        $brands = [];
        if ($this->relationLoaded('brand') ? $this->brand : $this->brand()->first()) {
            $b = $this->brand;
            if ($b && $b->is_active) {
                $brands[] = [
                    'id'      => $b->id,
                    'name'    => $b->name,
                    'name_en' => $b->name_en,
                    'slug'    => $b->slug,
                    'image'   => $b->resolved_image,
                ];
            }
        }

        $categories = ($this->relationLoaded('categories') ? $this->categories : $this->categories()->get())
            ->map(fn (Category $c) => [
                'id'      => $c->id,
                'name'    => $c->name,
                'name_en' => $c->name_en,
                'slug'    => $c->slug,
            ])
            ->values()
            ->all();

        $tags = ($this->relationLoaded('tags') ? $this->tags : $this->tags()->get())
            ->map(fn (Tag $t) => [
                'id'      => $t->id,
                'name'    => $t->name,
                'name_en' => $t->name_en,
                'slug'    => $t->slug,
            ])
            ->values()
            ->all();

        $relatedIds = collect($this->related_product_ids ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0 && $id !== $this->id)
            ->unique()
            ->values()
            ->all();

        $payload = [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'name_en'              => $this->name_en,
            'slug'                 => $this->slug,
            'sku'                  => $this->sku,
            'barcode'              => $this->barcode,
            'unit'                 => $this->unit,
            'type'                 => $this->type ?: 'simple',
            'status'               => $this->status ?: 'publish',
            'description'          => $this->description,
            'description_en'       => $this->description_en,
            'short_description'    => $this->short_description,
            'short_description_en' => $this->short_description_en,
            'price'                => (string) $this->price,
            'regular_price'        => (string) $this->regular_price,
            'sale_price'           => $this->on_sale && $this->sale_price !== null ? (string) $this->sale_price : null,
            'on_sale'              => (bool) $this->on_sale,
            'stock_status'         => $this->stock_status ?: 'instock',
            'stock_quantity'       => $this->manage_stock ? $this->stock_quantity : null,
            'featured'             => (bool) $this->featured,
            'bundle_qty'           => $this->bundle_qty,
            'average_rating'       => number_format((float) $this->average_rating, 2, '.', ''),
            'rating_count'         => (int) $this->rating_count,
            'total_sales'          => (int) $this->total_sales,
            'images'               => $images,
            'categories'           => $categories,
            'tags'                 => $tags,
            'related_product_ids'  => $relatedIds,
            'brands'               => $brands,
        ];

        if ($includeVariations || $this->type === 'variable') {
            $variations = ($this->relationLoaded('variations') ? $this->variations : $this->variations()->get())
                ->map(fn (ProductVariation $v) => $v->toApiArray())
                ->values()
                ->all();
            $payload['variations'] = $variations;
        }

        return $payload;
    }
}
