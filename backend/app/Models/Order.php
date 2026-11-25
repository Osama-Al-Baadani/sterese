<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'idempotency_key',
        'access_key',
        'woo_order_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'address',
        'city',
        'subtotal',
        'delivery_fee',
        'discount',
        'wallet_amount',
        'cod_fee',
        'woo_customer_id',
        'delivery_type',
        'gps_coordinates',
        'total',
        'tax_amount',
        'status',
        'delivery_status',
        'payment_method',
        'source',
        'notes',
        'items',
        'snapchat_purchase_sent',
        'attribution_source',
        'attribution_media_source',
        'attribution_campaign',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $order) {
            if (empty($order->access_key)) {
                $order->access_key = \Illuminate\Support\Str::random(32);
            }
        });
    }

    protected $casts = [
        'items'         => 'array',
        'subtotal'      => 'decimal:2',
        'delivery_fee'  => 'decimal:2',
        'discount'      => 'decimal:2',
        'wallet_amount' => 'decimal:2',
        'cod_fee'       => 'decimal:2',
        'total'         => 'decimal:2',
        'tax_amount'    => 'decimal:2',
        'snapchat_purchase_sent' => 'boolean',
    ];

    // A retried checkout attempt can leave more than one Payment row behind
    // (see OrderController::create's idempotency handling) — always resolve
    // to the most recent one, the only one that can still go anywhere.
    public function payment()
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    // المجموع الفرعي قبل الضريبة (subtotal يخزَّن شامل الضريبة دائماً، لأن أسعار المنتجات شاملة للضريبة أصلاً)
    public function getSubtotalBeforeTaxAttribute(): float
    {
        return round((float) $this->subtotal - (float) $this->tax_amount, 2);
    }

    public function getMapUrlAttribute(): ?string
    {
        // Try gps_coordinates field first
        if (!empty($this->attributes['gps_coordinates'])) {
            return 'https://www.google.com/maps?q=' . trim($this->attributes['gps_coordinates']);
        }
        // Fall back to parsing GPS from notes field: "GPS: lat, lng إحداثيات"
        if ($this->notes && preg_match('/GPS:\s*([\d.]+),\s*([\d.]+)/', $this->notes, $m)) {
            return 'https://www.google.com/maps?q=' . $m[1] . ',' . $m[2];
        }
        return null;
    }

    public static function toWooStatus(string $deliveryStatus): string
    {
        return match ($deliveryStatus) {
            'confirmed' => 'processing',
            'preparing' => 'on-hold',
            'shipped'   => 'on-hold',
            'delivered' => 'completed',
            'cancelled' => 'cancelled',
            default     => 'pending',
        };
    }

    public static function deliveryStatusOptions(): array
    {
        return [
            'pending'   => '⏳ في الانتظار',
            'confirmed' => '✅ تم التأكيد',
            'preparing' => '📦 جارٍ التحضير',
            'shipped'   => '🚚 في الطريق',
            'delivered' => '🎉 تم التسليم',
            'cancelled' => '❌ ملغي',
        ];
    }
}
