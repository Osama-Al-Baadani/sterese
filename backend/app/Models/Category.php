<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Category extends Model
{
    protected $fillable = [
        'name',
        'name_en',
        'slug',
        'parent_id',
        'description',
        'image_path',
        'external_image_url',
        'sort_order',
        'is_active',
        'woo_category_id',
    ];

    protected $casts = [
        'parent_id'  => 'integer',
        'sort_order' => 'integer',
        'is_active'  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $category) {
            if (empty($category->parent_id) || (int) $category->parent_id === 0 || ($category->exists && (int) $category->parent_id === (int) $category->id)) {
                $category->parent_id = null;
            }

            $rawSlug = trim((string) ($category->slug ?: ($category->name_en ?: $category->name)));
            $category->slug = static::uniqueSlug($rawSlug, $category->exists ? $category->id : null);
        });
    }

    public static function uniqueSlug(string $raw, ?int $ignoreId = null): string
    {
        $base = trim((string) preg_replace('/[^\p{Arabic}a-z0-9]+/iu', '-', mb_strtolower($raw)), '-');
        if ($base === '') {
            $base = 'category-' . Str::lower(Str::random(6));
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

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_category');
    }

    public function getImageUrlAttribute(): ?string
    {
        if (!empty($this->image_path)) {
            if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
                return $this->image_path;
            }
            return Storage::disk('public')->url($this->image_path);
        }

        return $this->external_image_url ?: null;
    }

    public function toApiArray(?int $productsCount = null): array
    {
        $imageUrl = $this->image_url;

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'name_en'     => $this->name_en,
            'slug'        => $this->slug,
            'parent'      => (int) ($this->parent_id ?? 0),
            'description' => $this->description,
            'image'       => $imageUrl ? ['src' => $imageUrl] : null,
            'count'       => (int) ($productsCount ?? $this->products_count ?? 0),
        ];
    }
}
