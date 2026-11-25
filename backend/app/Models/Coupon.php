<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'description',
        'type',
        'amount',
        'free_shipping',
        'minimum_amount',
        'maximum_amount',
        'product_ids',
        'usage_limit',
        'usage_count',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'amount'         => 'decimal:2',
        'free_shipping'  => 'boolean',
        'minimum_amount' => 'decimal:2',
        'maximum_amount' => 'decimal:2',
        'product_ids'    => 'array',
        'usage_limit'    => 'integer',
        'usage_count'    => 'integer',
        'expires_at'     => 'datetime',
        'is_active'      => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $coupon) {
            $coupon->code = strtoupper(trim($coupon->code));
        });
    }

    /**
     * Validates coupon usability against cart subtotal & optional product IDs.
     *
     * @param  int[]  $cartProductIds
     * @return array{valid: bool, message?: string, data?: array<string, mixed>}
     */
    public static function evaluate(string $rawCode, float $subtotal = 0.0, array $cartProductIds = []): array
    {
        $code = strtoupper(trim($rawCode));
        if ($code === '') {
            return ['valid' => false, 'message' => 'يرجى إدخال كود الخصم'];
        }

        $coupon = static::whereRaw('UPPER(code) = ?', [$code])->first();
        if (!$coupon || !$coupon->is_active) {
            return ['valid' => false, 'message' => 'كود الخصم غير صحيح أو غير مفعّل'];
        }

        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            return ['valid' => false, 'message' => 'انتهت صلاحية كود الخصم'];
        }

        if ($coupon->usage_limit !== null && $coupon->usage_limit > 0 && $coupon->usage_count >= $coupon->usage_limit) {
            return ['valid' => false, 'message' => 'تم استنفاد الحد الأقصى لاستخدام هذا الكود'];
        }

        $min = (float) $coupon->minimum_amount;
        if ($min > 0 && $subtotal > 0 && $subtotal < $min) {
            return [
                'valid'   => false,
                'message' => 'الحد الأدنى لتفعيل هذا الكود هو ' . number_format($min, 2) . ' ر.س',
            ];
        }

        $max = (float) $coupon->maximum_amount;
        if ($max > 0 && $subtotal > 0 && $subtotal > $max) {
            return [
                'valid'   => false,
                'message' => 'قيمة السلة تتجاوز الحد الأقصى المسموح لهذا الكود (' . number_format($max, 2) . ' ر.س)',
            ];
        }

        $allowedProducts = array_values(array_filter(array_map('intval', $coupon->product_ids ?? [])));
        if (!empty($allowedProducts) && !empty($cartProductIds)) {
            $normalizedCart = array_map('intval', $cartProductIds);
            if (empty(array_intersect($allowedProducts, $normalizedCart))) {
                return ['valid' => false, 'message' => 'هذا الكود مخصص لمنتجات محددة غير موجودة في سلتك'];
            }
        }

        $type = $coupon->type === 'percent' ? 'percent' : 'fixed';
        $amount = (float) $coupon->amount;
        $discountAmount = $type === 'percent'
            ? round($subtotal * ($amount / 100), 2)
            : min($amount, max(0.0, $subtotal));

        return [
            'valid'  => true,
            'coupon' => $coupon,
            'data'   => [
                'valid'           => true,
                'code'            => $coupon->code,
                'description'     => $coupon->description,
                'type'            => $type,
                'amount'          => $amount,
                'free_shipping'   => (bool) $coupon->free_shipping,
                'discount_amount' => $discountAmount,
            ],
        ];
    }
}
