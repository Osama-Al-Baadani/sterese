<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Banner;
use App\Models\DeliveryZone;
use App\Models\Faq;
use App\Models\OfferPage;
use App\Models\Policy;
use App\Models\ProductQtyLimit;
use Illuminate\Support\Facades\Cache;

class AppConfigController extends Controller
{
    public function index()
    {
        $config = Cache::remember('app_config', 300, function () {
            $allBanners = Banner::where('is_active', true)->orderBy('sort_order')->get();

            $bannerMapper = fn ($b) => [
                'id'         => $b->id,
                'image_url'  => $b->image_url,
                'link_type'  => $b->link_type,
                'link_value' => $b->link_value,
            ];

            $promoMapper = fn ($b) => [
                'id'          => $b->id,
                'image_url'   => $b->image_url,
                'title_ar'    => $b->title_ar,
                'subtitle_ar' => $b->subtitle_ar,
                'link_type'   => $b->link_type,
                'link_value'  => $b->link_value,
            ];

            $carouselBanners = $allBanners->where('type', 'carousel')
                ->map($bannerMapper)->values()->toArray();

            $webCarouselBanners = $allBanners->where('type', 'web_carousel')
                ->map($bannerMapper)->values()->toArray();
            if (empty($webCarouselBanners)) {
                $webCarouselBanners = $carouselBanners;
            }

            $gridTileBanners = $allBanners->where('type', 'grid_tile')
                ->map($bannerMapper)->values()->toArray();

            $gridStackBanners = $allBanners->where('type', 'grid_stack')
                ->map($bannerMapper)->values()->toArray();

            $promoCards = $allBanners->where('type', 'promo')->take(2)
                ->map($promoMapper)->values()->toArray();

            $promoBottomCards = $allBanners->where('type', 'promo_bottom')->take(2)
                ->map($promoMapper)->values()->toArray();

            $offerPages = OfferPage::where('is_active', true)->orderBy('sort_order')
                ->get()->map(fn ($o) => [
                    'id'     => $o->id,
                    'label'  => $o->label,
                    'tag_id' => $o->tag_id,
                    'icon'   => $o->icon,
                ])->values()->toArray();

            $deliveryZones = DeliveryZone::where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($z) => [
                    'id'             => $z->id,
                    'name'           => $z->name,
                    'cities'         => $z->cities ?? [],
                    'base_fee'       => $z->base_fee,
                    'free_threshold' => $z->free_threshold,
                    'promo_active'   => $z->isPromoActive(),
                    'promo_type'     => $z->promo_type,
                    'promo_label'    => $z->promo_label ?? '',
                    'promo_end'      => $z->promo_end?->toIso8601String(),
                ])->values()->toArray();

            $s = AppSetting::current();
            $qtyLimitsMap = ProductQtyLimit::all()
                ->mapWithKeys(fn ($r) => [(string) $r->woo_product_id => $r->max_qty])
                ->toArray();

            $storeSettings = [
                'delivery_fee'            => (float) $s->delivery_fee,
                'free_shipping_threshold' => (float) $s->free_shipping_threshold,
                'min_order_value'         => (float) $s->min_order_value,
                'whatsapp_phone'          => (string) $s->whatsapp_phone,
                'support_phone'           => (string) $s->support_phone,
                'support_email'           => (string) $s->support_email,
                'working_hours_weekday'   => (string) $s->working_hours_weekday,
                'working_hours_friday'    => (string) $s->working_hours_friday,
                'announcement_active'     => (bool) $s->announcement_active,
                'announcement_text'       => (string) $s->announcement_text,
                'badges'                  => array_values(array_filter([
                    (string) $s->badge1_label,
                    (string) $s->badge2_label,
                    (string) $s->badge3_label,
                    (string) $s->badge4_label,
                ])),
                'gift' => [
                    'enabled'    => (bool)   ($s->gift_enabled ?? true),
                    'product_id' => (int)    ($s->gift_product_id ?? 0),
                    'min_amount' => (float)  ($s->gift_min_amount ?? 200.0),
                    'label'      => (string) ($s->gift_label ?? 'هدية مجانية'),
                ],
                'default_max_qty' => (int) ($s->default_max_qty ?? 10),
                'free_delivery_near_branch' => [
                    'enabled'        => (bool)  ($s->free_delivery_near_branch_enabled ?? false),
                    'branch_lat'     => (float) ($s->branch_lat ?? 24.598000),
                    'branch_lng'     => (float) ($s->branch_lng ?? 46.639308),
                    'radius_km'      => (float) ($s->free_delivery_radius_km ?? 5),
                    'fee'            => (float) ($s->near_branch_delivery_fee ?? 0),
                    'free_threshold' => $s->near_branch_free_threshold !== null
                        ? (float) $s->near_branch_free_threshold
                        : null,
                ],
                'cod' => [
                    'enabled'     => (bool)  ($s->cod_enabled ?? false),
                    'fee_enabled' => (bool)  ($s->cod_fee_enabled ?? false),
                    'fee_amount'  => (float) ($s->cod_fee_amount ?? 0),
                ],
            ];

            $faqs = Faq::where('is_active', true)->orderBy('sort_order')
                ->get()->map(fn ($f) => [
                    'question' => $f->question,
                    'answer'   => $f->answer,
                ])->toArray();

            $policies = [];
            foreach (['return', 'privacy', 'terms'] as $type) {
                $p = Policy::byType($type);
                if ($p) {
                    $policies[$type] = [
                        'title'    => $p->title,
                        'sections' => $p->sections,
                    ];
                }
            }

            $promoPopup = [
                'active'        => (bool)   ($s->promo_popup_active ?? false),
                'title'         => (string) ($s->promo_popup_title ?? ''),
                'description'   => (string) ($s->promo_popup_description ?? ''),
                'coupon_code'   => (string) ($s->promo_popup_coupon_code ?? ''),
                'expires_label' => (string) ($s->promo_popup_expires_label ?? ''),
                'image'         => (string) ($s->promo_popup_image ?? ''),
            ];

            return [
                'carouselBanners'    => $carouselBanners,
                'webCarouselBanners' => $webCarouselBanners,
                'gridTileBanners'    => $gridTileBanners,
                'gridStackBanners'   => $gridStackBanners,
                'promoCards'         => $promoCards,
                'promoBottomCards'   => $promoBottomCards,
                'offerPages'         => $offerPages,
                'storeSettings'      => $storeSettings,
                'faqs'               => $faqs,
                'policies'           => $policies,
                'promoPopup'         => $promoPopup,
                'productQtyLimits'   => $qtyLimitsMap,
                'deliveryZones'      => $deliveryZones,
            ];
        });

        return response()->json($config);
    }
}
