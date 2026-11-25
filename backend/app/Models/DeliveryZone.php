<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DeliveryZone extends Model
{
    protected $fillable = [
        'name', 'cities', 'base_fee', 'free_threshold',
        'promo_active', 'promo_type', 'promo_start', 'promo_end', 'promo_label',
        'sort_order', 'is_active',
    ];

    protected $casts = [
        'cities'       => 'array',
        'base_fee'     => 'float',
        'free_threshold' => 'float',
        'promo_active' => 'boolean',
        'promo_start'  => 'datetime',
        'promo_end'    => 'datetime',
        'is_active'    => 'boolean',
    ];

    // هل العرض ساري الآن؟
    public function isPromoActive(): bool
    {
        if (!$this->promo_active) return false;

        if ($this->promo_type === 'schedule') {
            $now = Carbon::now();
            return $this->promo_start && $this->promo_end
                && $now->between($this->promo_start, $this->promo_end);
        }

        if ($this->promo_type === 'first_order') return true;

        return false;
    }
}
