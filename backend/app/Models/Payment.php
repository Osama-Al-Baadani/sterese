<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'paymob_order_id',
        'paymob_transaction_id',
        'status',
        'payment_method',
        'amount',
        'currency',
        'paymob_response',
        'error_message',
        'refunded_amount',
    ];

    protected $casts = [
        'paymob_response' => 'array',
        'amount'          => 'decimal:2',
        'refunded_amount' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
