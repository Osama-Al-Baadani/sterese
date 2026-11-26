<?php

namespace App\Filament\Resources\ProductResource\Widgets;

use App\Filament\Resources\ProductResource\Pages\ListProducts;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class ProductStats extends BaseWidget
{
    protected ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $stats = ListProducts::getCachedProductStats();

        return [
            Stat::make('إجمالي المنتجات', number_format($stats['total']))
                ->description("{$stats['published']} منتج منشور · {$stats['on_sale']} عليه عرض")
                ->color('primary')
                ->icon('heroicon-o-cube'),

            Stat::make('حالة المخزون', $stats['outofstock'] > 0 ? "{$stats['outofstock']} نفد من المخزون" : 'كل المنتجات متوفرة')
                ->description('إجمالي الوحدات المسجلة: ' . number_format($stats['inventory']))
                ->color($stats['outofstock'] > 0 ? 'warning' : 'success')
                ->icon('heroicon-o-archive-box'),

            Stat::make('متوسط سعر المنتج', number_format($stats['avg_price'], 2) . ' ر.س')
                ->description('متوسط الأسعار الحالية في الكتالوج')
                ->color('info')
                ->icon('heroicon-o-banknotes'),
        ];
    }
}
