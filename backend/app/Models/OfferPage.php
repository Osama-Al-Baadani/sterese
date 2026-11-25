<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfferPage extends Model
{
    protected $fillable = [
        'label',
        'tag_id',
        'icon',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'tag_id'     => 'integer',
        'sort_order' => 'integer',
    ];
}
