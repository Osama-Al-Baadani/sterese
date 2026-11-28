<?php

namespace App\Providers;

use App\Models\AppSetting;
use App\Models\Banner;
use App\Models\BrandSetting;
use App\Models\BrowseSection;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\Faq;
use App\Models\HomeDepartment;
use App\Models\HomeSection;
use App\Models\HomeSectionBanner;
use App\Models\OfferPage;
use App\Models\Policy;
use App\Models\Product;
use App\Models\ProductQtyLimit;
use App\Models\ProductVariation;
use App\Models\Tag;
use App\Support\StorefrontCache;
use Filament\Support\Facades\FilamentTimezone;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Everything is stored/computed in UTC (app.timezone stays UTC) —
        // this only changes how Filament *displays* dates/times, converting
        // them to Riyadh local time, without touching what's actually saved
        // or how any date math elsewhere in the app works.
        FilamentTimezone::set('Asia/Riyadh');

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Ensure Storage::disk('public')->url(...) matches the active request host/port (e.g. :8000 vs :8001)
        if (!$this->app->runningInConsole() && request()->getHost()) {
            config([
                'filesystems.disks.public.url' => rtrim(request()->getSchemeAndHttpHost(), '/') . '/storage',
            ]);
        }

        // Allow Livewire temporary upload previews for modern image extensions (.avif, .jfif, .heic, etc.)
        $previewMimes = config('livewire.temporary_file_upload.preview_mimes', []);
        config([
            'livewire.temporary_file_upload.preview_mimes' => array_values(array_unique(array_merge(
                is_array($previewMimes) ? $previewMimes : [],
                ['avif', 'jfif', 'webp', 'svg', 'heic', 'heif'],
            ))),
        ]);

        // Automatically bump storefront cache version & notify Next.js whenever
        // any catalog, banner, section, or store configuration model changes.
        $storefrontModels = [
            Product::class,
            ProductVariation::class,
            Category::class,
            BrandSetting::class,
            Tag::class,
            Banner::class,
            HomeSection::class,
            HomeSectionBanner::class,
            HomeDepartment::class,
            BrowseSection::class,
            AppSetting::class,
            DeliveryZone::class,
            OfferPage::class,
            Policy::class,
            Faq::class,
            ProductQtyLimit::class,
        ];

        $bump = static fn () => StorefrontCache::bump();
        foreach ($storefrontModels as $modelClass) {
            $modelClass::saved($bump);
            $modelClass::deleted($bump);
        }
    }
}
