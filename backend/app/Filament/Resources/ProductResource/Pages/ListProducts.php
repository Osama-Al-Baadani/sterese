<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Actions\ExcelImportAction;
use App\Filament\Exports\ProductExporter;
use App\Filament\Imports\ProductImporter;
use App\Filament\Resources\ProductResource;
use App\Filament\Resources\ProductResource\Widgets\ProductStats;
use App\Models\Product;
use Filament\Actions\CreateAction;
use Filament\Actions\ExportAction;
use Filament\Resources\Pages\ListRecords;
use Filament\Schemas\Components\Tabs\Tab;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class ListProducts extends ListRecords
{
    protected static string $resource = ProductResource::class;

    public static function getCachedProductStats(): array
    {
        return Cache::remember('products_list_stats_v1', 30, function (): array {
            $agg = Product::query()
                ->selectRaw("
                    COUNT(*) as total_count,
                    COALESCE(SUM(CASE WHEN status = 'publish' THEN 1 ELSE 0 END), 0) as published_count,
                    COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) as draft_count,
                    COALESCE(SUM(CASE WHEN stock_status = 'instock' THEN 1 ELSE 0 END), 0) as instock_count,
                    COALESCE(SUM(CASE WHEN stock_status = 'outofstock' THEN 1 ELSE 0 END), 0) as outofstock_count,
                    COALESCE(SUM(CASE WHEN on_sale = 1 THEN 1 ELSE 0 END), 0) as on_sale_count,
                    COALESCE(SUM(CASE WHEN stock_quantity IS NOT NULL THEN stock_quantity ELSE 0 END), 0) as total_inventory,
                    COALESCE(AVG(price), 0) as avg_price
                ")
                ->first();

            return [
                'total'      => (int) ($agg->total_count ?? 0),
                'published'  => (int) ($agg->published_count ?? 0),
                'draft'      => (int) ($agg->draft_count ?? 0),
                'instock'    => (int) ($agg->instock_count ?? 0),
                'outofstock' => (int) ($agg->outofstock_count ?? 0),
                'on_sale'    => (int) ($agg->on_sale_count ?? 0),
                'inventory'  => (int) ($agg->total_inventory ?? 0),
                'avg_price'  => (float) ($agg->avg_price ?? 0),
            ];
        });
    }

    public static function clearProductStatsCache(): void
    {
        Cache::forget('products_list_stats_v1');
        Cache::forget('nav_badge_products_count');
        Cache::forget('dashboard_stats_overview_v1');
    }

    protected function getHeaderActions(): array
    {
        return [
            ExcelImportAction::make()
                ->label('استيراد المنتجات (Excel / CSV)')
                ->modalHeading('استيراد المنتجات دفعة واحدة وإنشاء أقسامها تلقائياً')
                ->icon('heroicon-o-arrow-up-tray')
                ->color('info')
                ->importer(ProductImporter::class),

            ExportAction::make()
                ->label('تصدير (Excel / CSV)')
                ->icon('heroicon-o-arrow-down-tray')
                ->color('gray')
                ->exporter(ProductExporter::class),

            CreateAction::make()
                ->label('+ إضافة منتج جديد')
                ->icon('heroicon-o-plus'),
        ];
    }

    protected function getHeaderWidgets(): array
    {
        return ProductResource::getWidgets();
    }

    public function getTabs(): array
    {
        $counts = self::getCachedProductStats();

        return [
            'all' => Tab::make('الكل')
                ->badge($counts['total']),

            'published' => Tab::make('منشور')
                ->icon('heroicon-m-check-circle')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'publish'))
                ->badge($counts['published'])
                ->badgeColor('success'),

            'instock' => Tab::make('متوفر بالمخزون')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('stock_status', 'instock'))
                ->badge($counts['instock'])
                ->badgeColor('info'),

            'outofstock' => Tab::make('نفدت الكمية')
                ->icon('heroicon-m-exclamation-triangle')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('stock_status', 'outofstock'))
                ->badge($counts['outofstock'])
                ->badgeColor('danger'),

            'on_sale' => Tab::make('عروض وخصومات')
                ->icon('heroicon-m-fire')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('on_sale', true))
                ->badge($counts['on_sale'])
                ->badgeColor('warning'),

            'draft' => Tab::make('مسودات')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'draft'))
                ->badge($counts['draft'])
                ->badgeColor('gray'),
        ];
    }
}
