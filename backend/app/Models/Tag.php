<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Tag extends Model
{
    protected $fillable = [
        'name',
        'name_en',
        'slug',
        'is_active',
        'woo_tag_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $tag) {
            $rawSlug = trim((string) ($tag->slug ?: ($tag->name_en ?: $tag->name)));
            $tag->slug = static::uniqueSlug($rawSlug, $tag->exists ? $tag->id : null);
        });
    }

    public static function uniqueSlug(string $raw, ?int $ignoreId = null): string
    {
        $base = trim((string) preg_replace('/[^\p{Arabic}a-z0-9]+/iu', '-', mb_strtolower($raw)), '-');
        if ($base === '') {
            $base = 'tag-' . Str::lower(Str::random(6));
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

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_tag');
    }

    public function toApiArray(): array
    {
        return [
            'id'      => $this->id,
            'name'    => $this->name,
            'name_en' => $this->name_en,
            'slug'    => $this->slug,
        ];
    }
}
