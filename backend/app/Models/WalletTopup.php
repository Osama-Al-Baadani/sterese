<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTopup extends Model
{
    protected $fillable = [
        'customer_id',
        'amount',
        'status',
        'source',
        'paymob_order_id',
        'paymob_transaction_id',
        'woo_order_id',
    ];

    protected $casts = [
        'customer_id' => 'integer',
        'amount'      => 'decimal:2',
    ];
}
