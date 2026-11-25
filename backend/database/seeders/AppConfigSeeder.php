<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\OfferPage;
use Illuminate\Database\Seeder;

class AppConfigSeeder extends Seeder
{
    public function run(): void
    {
        Banner::create([
            'external_url' => 'https://picsum.photos/1200/375',
            'link_type'    => 'category',
            'link_value'   => '17',
            'sort_order'   => 1,
            'is_active'    => true,
        ]);

        OfferPage::create(['label' => 'المواد الغذائية', 'tag_id' => 1674, 'icon' => 'shopping_basket_rounded',          'sort_order' => 1, 'is_active' => true]);
        OfferPage::create(['label' => 'العناية',          'tag_id' => 1673, 'icon' => 'face_retouching_natural_outlined', 'sort_order' => 2, 'is_active' => true]);
        OfferPage::create(['label' => 'العناية المنزلية', 'tag_id' => 1678, 'icon' => 'cleaning_services_outlined',       'sort_order' => 3, 'is_active' => true]);

        echo "Created: " . Banner::count() . " banners, " . OfferPage::count() . " offer pages\n";
    }
}
