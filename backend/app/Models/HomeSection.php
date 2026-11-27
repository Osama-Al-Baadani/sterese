<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomeSection extends Model
{
    protected $fillable = [
        'title',
        'icon',
        'source_type',
        'source_id',
        'source_ids',
        'source_slugs',
        'product_ids',
        'visible',
        'sort_order',
        'products_limit',
        'sort_by',
    ];

    protected $casts = [
        'visible'      => 'boolean',
        'source_ids'   => 'array',
        'source_slugs' => 'array',
        'product_ids'  => 'array',
    ];

    public function banners()
    {
        return $this->hasMany(HomeSectionBanner::class)->orderBy('sort_order');
    }

    protected static function booted(): void
    {
        static::saved(function () {
            \Illuminate\Support\Facades\Cache::forget('api_home_sections');
            \Illuminate\Support\Facades\Cache::put('catalog_cache_ver', (string) hrtime(true), 86400);
        });
        static::deleted(function () {
            \Illuminate\Support\Facades\Cache::forget('api_home_sections');
            \Illuminate\Support\Facades\Cache::put('catalog_cache_ver', (string) hrtime(true), 86400);
        });
    }
}
