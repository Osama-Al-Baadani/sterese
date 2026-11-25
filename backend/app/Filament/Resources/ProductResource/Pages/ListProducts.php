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

class ListProducts extends ListRecords
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ExcelImportAction::make()
                ->label('استيراد المنتجات (Excel / CSV)')
                ->modalHeading('استيراد المنتجات وإنشاء أقسامها تلقائياً')
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
        return [
            'all' => Tab::make('الكل')
                ->badge(Product::count()),

            'published' => Tab::make('منشور')
                ->icon('heroicon-m-check-circle')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'publish'))
                ->badge(Product::where('status', 'publish')->count())
                ->badgeColor('success'),

            'instock' => Tab::make('متوفر بالمخزون')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('stock_status', 'instock'))
                ->badge(Product::where('stock_status', 'instock')->count())
                ->badgeColor('info'),

            'outofstock' => Tab::make('نفدت الكمية')
                ->icon('heroicon-m-exclamation-triangle')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('stock_status', 'outofstock'))
                ->badge(Product::where('stock_status', 'outofstock')->count())
                ->badgeColor('danger'),

            'on_sale' => Tab::make('عروض وخصومات')
                ->icon('heroicon-m-fire')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('on_sale', true))
                ->badge(Product::where('on_sale', true)->count())
                ->badgeColor('warning'),

            'draft' => Tab::make('مسودات')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'draft'))
                ->badge(Product::where('status', 'draft')->count())
                ->badgeColor('gray'),
        ];
    }
}
