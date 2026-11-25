<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $fillable = [
        'delivery_fee', 'free_shipping_threshold', 'min_order_value',
        'whatsapp_phone', 'support_phone', 'support_email',
        'working_hours_weekday', 'working_hours_friday',
        'announcement_active', 'announcement_text',
        'badge1_label', 'badge2_label', 'badge3_label', 'badge4_label',
        'gift_enabled', 'gift_product_id', 'gift_min_amount', 'gift_label',
        'default_max_qty',
        'welcome_offer_active', 'welcome_offer_type',
        'welcome_offer_discount_percent', 'welcome_offer_discount_amount',
        'welcome_offer_discount_min_order',
        'welcome_offer_expiry_days',
        'welcome_offer_gift_product_id', 'welcome_offer_gift_product_name', 'welcome_offer_gift_image',
        'promo_popup_active', 'promo_popup_title', 'promo_popup_description',
        'promo_popup_coupon_code', 'promo_popup_expires_label', 'promo_popup_image',
        'free_delivery_near_branch_enabled', 'branch_lat', 'branch_lng', 'free_delivery_radius_km',
        'near_branch_delivery_fee', 'near_branch_free_threshold',
        'cod_enabled', 'cod_fee_enabled', 'cod_fee_amount',
    ];

    protected $casts = [
        'delivery_fee'                       => 'float',
        'free_shipping_threshold'            => 'float',
        'min_order_value'                    => 'float',
        'announcement_active'                => 'boolean',
        'gift_enabled'                       => 'boolean',
        'gift_product_id'                    => 'integer',
        'gift_min_amount'                    => 'float',
        'default_max_qty'                    => 'integer',
        'welcome_offer_active'               => 'boolean',
        'welcome_offer_discount_percent'     => 'integer',
        'welcome_offer_discount_amount'      => 'float',
        'welcome_offer_discount_min_order'   => 'float',
        'welcome_offer_expiry_days'          => 'integer',
        'welcome_offer_gift_product_id'      => 'integer',
        'promo_popup_active'                 => 'boolean',
        'free_delivery_near_branch_enabled'  => 'boolean',
        'branch_lat'                         => 'float',
        'branch_lng'                         => 'float',
        'free_delivery_radius_km'            => 'float',
        'near_branch_delivery_fee'           => 'float',
        'near_branch_free_threshold'         => 'float',
        'cod_enabled'                        => 'boolean',
        'cod_fee_enabled'                    => 'boolean',
        'cod_fee_amount'                     => 'float',
    ];

    // دائماً نقرأ من الصف الأول — وننشئه إذا ما كان موجوداً
    public static function current(): static
    {
        return static::firstOrCreate([], []);
    }
}
