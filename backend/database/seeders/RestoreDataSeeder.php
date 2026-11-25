<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\OfferPage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RestoreDataSeeder extends Seeder
{
    public function run(): void
    {
        // ─── مناطق التوصيل ────────────────────────────────────────────────────
        DB::table('delivery_zones')->delete(); // clear before re-insert
        DB::table('delivery_zones')->insert([
            [
                'name'            => 'داخل الرياض',
                'cities'          => json_encode(['الرياض']),
                'base_fee'        => 25.00,
                'free_threshold'  => 0,
                'promo_active'    => false,
                'promo_type'      => null,
                'promo_start'     => null,
                'promo_end'       => null,
                'promo_label'     => '',
                'sort_order'      => 1,
                'is_active'       => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
            [
                'name'            => 'خارج الرياض',
                'cities'          => json_encode([]),
                'base_fee'        => 30.00,
                'free_threshold'  => 0,
                'promo_active'    => false,
                'promo_type'      => null,
                'promo_start'     => null,
                'promo_end'       => null,
                'promo_label'     => '',
                'sort_order'      => 2,
                'is_active'       => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
        ]);
        echo "Delivery zones: " . DB::table('delivery_zones')->count() . " zones\n";

        // ─── صفحات العروض ─────────────────────────────────────────────────────
        if (DB::table('offer_pages')->count() === 0) {
            DB::table('offer_pages')->insert([
                ['label' => 'المواد الغذائية', 'tag_id' => 1674, 'icon' => 'shopping_basket_rounded',           'sort_order' => 1, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['label' => 'العناية',          'tag_id' => 1673, 'icon' => 'face_retouching_natural_outlined',  'sort_order' => 2, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['label' => 'العناية المنزلية', 'tag_id' => 1678, 'icon' => 'cleaning_services_outlined',        'sort_order' => 3, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
            echo "Offer pages: " . DB::table('offer_pages')->count() . " pages\n";
        } else {
            echo "Offer pages already exist: " . DB::table('offer_pages')->count() . "\n";
        }

        // ─── ملخص ─────────────────────────────────────────────────────────────
        echo "\n=== Summary ===\n";
        echo "delivery_zones : " . DB::table('delivery_zones')->count() . "\n";
        echo "offer_pages    : " . DB::table('offer_pages')->count() . "\n";
        echo "banners        : " . DB::table('banners')->count() . " (أضفها يدوياً من لوحة التحكم)\n";
        echo "home_sections  : " . DB::table('home_sections')->count() . "\n";
    }
}
