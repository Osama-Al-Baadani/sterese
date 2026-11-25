<?php

namespace App\Filament\Resources\ProductResource\Widgets;

use App\Models\Product;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class ProductStats extends BaseWidget
{
    protected function getStats(): array
    {
        $totalProducts = Product::count();
        $publishedCount = Product::where('status', 'publish')->count();
        $outOfStockCount = Product::where('stock_status', 'outofstock')->count();
        $totalInventory = (int) Product::whereNotNull('stock_quantity')->sum('stock_quantity');
        $avgPrice = (float) Product::avg('price');
        $onSaleCount = Product::where('on_sale', true)->count();

        return [
            Stat::make('إجمالي المنتجات', number_format($totalProducts))
                ->description("{$publishedCount} منتج منشور · {$onSaleCount} عليه عرض")
                ->color('primary')
                ->icon('heroicon-o-cube'),

            Stat::make('حالة المخزون', $outOfStockCount > 0 ? "{$outOfStockCount} نفد من المخزون" : 'كل المنتجات متوفرة')
                ->description('إجمالي الوحدات المسجلة: ' . number_format($totalInventory))
                ->color($outOfStockCount > 0 ? 'warning' : 'success')
                ->icon('heroicon-o-archive-box'),

            Stat::make('متوسط سعر المنتج', number_format($avgPrice, 2) . ' ر.س')
                ->description('متوسط الأسعار الحالية في الكتالوج')
                ->color('info')
                ->icon('heroicon-o-banknotes'),
        ];
    }
}
