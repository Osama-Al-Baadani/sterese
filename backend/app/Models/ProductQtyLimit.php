<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductQtyLimit extends Model
{
    protected $fillable = ['woo_product_id', 'product_name', 'max_qty'];
}
