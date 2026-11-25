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
}
