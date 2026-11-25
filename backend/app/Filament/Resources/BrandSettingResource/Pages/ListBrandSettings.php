<?php

namespace App\Filament\Resources\BrandSettingResource\Pages;

use App\Filament\Resources\BrandSettingResource;
use App\Models\BrandSetting;
use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Support\Facades\Http;

class ListBrandSettings extends ListRecords
{
    protected static string $resource = BrandSettingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->label('+ إضافة براند جديد'),

            Action::make('sync')
                ->label('مزامنة من WooCommerce')
                ->icon('heroicon-o-arrow-path')
                ->color('gray')
                ->visible(fn () => filled(config('services.woocommerce.url')) && filled(config('services.woocommerce.key')))
                ->action(function () {
                    try {
                        // See App\Support\OriginHttp — same-server
                        // PHP->WooCommerce requests get a flat 403 from
                        // this host; shell `curl` is unaffected.
                        $res = \App\Support\OriginHttp::fluent()
                            ->withBasicAuth(
                                config('services.woocommerce.key'),
                                config('services.woocommerce.secret')
                            )->baseUrl(rtrim(config('services.woocommerce.url'), '/') . '/wp-json/wc/v3/')
                             ->asJson()
                             ->get('pwb-brand', ['per_page' => 100, 'orderby' => 'name', 'order' => 'asc']);
                    } catch (\Exception $e) {
                        Notification::make()
                            ->title('فشلت المزامنة — خطأ في الاتصال')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                        return;
                    }

                    if (!$res->successful()) {
                        $status = $res->status();
                        $hint = match(true) {
                            $status === 404 => 'الـ endpoint غير موجود — تأكد من تثبيت إضافة Perfect WooCommerce Brands على WordPress',
                            $status === 401 => 'بيانات الاعتماد خاطئة — تحقق من WOOCOMMERCE_KEY و WOOCOMMERCE_SECRET في .env',
                            $status === 403 => 'ليس لديك صلاحية — تحقق من صلاحيات المفتاح في WooCommerce',
                            default         => "HTTP {$status} — " . substr($res->body(), 0, 200),
                        };

                        Notification::make()
                            ->title("فشلت المزامنة (HTTP {$status})")
                            ->body($hint)
                            ->danger()
                            ->persistent()
                            ->send();
                        return;
                    }

                    $brands = $res->json();
                    $synced = 0;

                    foreach ($brands as $b) {
                        $imageUrl = $b['pwb_brand_image']['url'] ?? ($b['image']['src'] ?? null);

                        BrandSetting::updateOrCreate(
                            ['woo_brand_id' => $b['id']],
                            [
                                'name'          => $b['name'],
                                'slug'          => $b['slug'],
                                'image_url'     => $imageUrl,
                                'product_count' => $b['count'] ?? 0,
                            ]
                        );
                        $synced++;
                    }

                    Notification::make()
                        ->title("تمت المزامنة — {$synced} براند")
                        ->body('البراندات الجديدة مخفية افتراضياً، فعّلها من القائمة')
                        ->success()
                        ->send();
                }),
        ];
    }
}
