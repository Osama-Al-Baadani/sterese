<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BrowseSection extends Model
{
    protected $fillable = [
        'title',
        'parent_category_id',
        'sub_category_ids',
        'sort_order',
        'visible',
    ];

    protected $casts = [
        'visible'          => 'boolean',
        'sub_category_ids' => 'array',
    ];
}
