<?php

namespace App\Filament\Widgets;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $todayConfirmed = Order::whereDate('created_at', today())
            ->whereIn('status', ['paid', 'cod', 'confirmed', 'shipped', 'delivered'])
            ->count();

        $totalRevenue = Order::whereIn('status', ['paid', 'cod', 'confirmed', 'shipped', 'delivered'])
            ->sum('total');
        $totalOrders = Order::count();

        $publishedProducts = Product::where('status', 'publish')->count();
        $outOfStockProducts = Product::where('status', 'publish')->where('stock_status', 'outofstock')->count();

        $customersCount = Customer::count();

        return [
            Stat::make('طلبات اليوم المعتمدة', $todayConfirmed)
                ->description('مدفوعة أو دفع عند الاستلام اليوم')
                ->color('success')
                ->icon('heroicon-o-shopping-bag'),

            Stat::make('إجمالي المبيعات', number_format((float) $totalRevenue, 2) . ' ر.س')
                ->description('من إجمالي ' . $totalOrders . ' طلب')
                ->color('primary')
                ->icon('heroicon-o-banknotes'),

            Stat::make('المنتجات المنشورة', $publishedProducts)
                ->description($outOfStockProducts > 0 ? "{$outOfStockProducts} منتج نفدت كميته" : 'كل المنتجات متوفرة بالمخزون')
                ->color($outOfStockProducts > 0 ? 'warning' : 'success')
                ->icon('heroicon-o-cube'),

            Stat::make('العملاء المسجلون', $customersCount)
                ->description('حسابات العملاء في المتجر')
                ->color('info')
                ->icon('heroicon-o-users'),
        ];
    }
}
