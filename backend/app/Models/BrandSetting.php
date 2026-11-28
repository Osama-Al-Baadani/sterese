<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BrandSetting extends Model
{
    protected $fillable = [
        'woo_brand_id',
        'name',
        'name_en',
        'slug',
        'image_path',
        'image_url',
        'product_count',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'product_count' => 'integer',
        'sort_order'    => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $brand) {
            $rawSlug = trim((string) ($brand->slug ?: ($brand->name_en ?: $brand->name)));
            $brand->slug = static::uniqueSlug($rawSlug, $brand->exists ? $brand->id : null);
        });

        static::saved(fn () => \App\Support\StorefrontCache::bump());
        static::deleted(fn () => \App\Support\StorefrontCache::bump());
    }

    public static function uniqueSlug(string $raw, ?int $ignoreId = null): string
    {
        $base = trim((string) preg_replace('/[^\p{Arabic}a-z0-9]+/iu', '-', mb_strtolower($raw)), '-');
        if ($base === '') {
            $base = 'brand-' . Str::lower(Str::random(6));
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

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'brand_setting_id');
    }

    public function getResolvedImageAttribute(): ?string
    {
        if (!empty($this->image_path)) {
            if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
                return $this->image_path;
            }
            return Storage::disk('public')->url($this->image_path);
        }

        return $this->image_url ?: null;
    }

    public function toApiArray(?int $count = null): array
    {
        $resolvedCount = $count ?? ($this->products_count ?? $this->product_count ?? 0);

        return [
            'id'      => $this->id,
            'name'    => $this->name,
            'name_en' => $this->name_en,
            'slug'    => $this->slug,
            'image'   => $this->resolved_image,
            'count'   => (int) $resolvedCount,
        ];
    }
}
