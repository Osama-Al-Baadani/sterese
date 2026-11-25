<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerAddress extends Model
{
    protected $fillable = [
        'phone',
        'label',
        'address_text',
        'city',
        'lat',
        'lng',
        'zone',
        'is_default',
    ];

    protected $casts = [
        'lat'        => 'float',
        'lng'        => 'float',
        'is_default' => 'boolean',
    ];
}
