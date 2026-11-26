<?php

namespace App\Filament\Widgets;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Cache;

class StatsOverview extends BaseWidget
{
    protected ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $data = Cache::remember('dashboard_stats_overview_v1', 60, function (): array {
            $todayDate = today()->toDateString();

            $orderAgg = Order::query()
                ->selectRaw("
                    COUNT(*) as total_orders,
                    COALESCE(SUM(CASE WHEN status IN ('paid','cod','confirmed','shipped','delivered') THEN total ELSE 0 END), 0) as total_revenue,
                    SUM(CASE WHEN DATE(created_at) = ? AND status IN ('paid','cod','confirmed','shipped','delivered') THEN 1 ELSE 0 END) as today_confirmed
                ", [$todayDate])
                ->first();

            $productAgg = Product::query()
                ->where('status', 'publish')
                ->selectRaw("
                    COUNT(*) as published_count,
                    SUM(CASE WHEN stock_status = 'outofstock' THEN 1 ELSE 0 END) as out_of_stock_count
                ")
                ->first();

            return [
                'todayConfirmed'     => (int) ($orderAgg->today_confirmed ?? 0),
                'totalRevenue'       => (float) ($orderAgg->total_revenue ?? 0),
                'totalOrders'        => (int) ($orderAgg->total_orders ?? 0),
                'publishedProducts'  => (int) ($productAgg->published_count ?? 0),
                'outOfStockProducts' => (int) ($productAgg->out_of_stock_count ?? 0),
                'customersCount'     => Customer::count(),
            ];
        });

        return [
            Stat::make('طلبات اليوم المعتمدة', $data['todayConfirmed'])
                ->description('مدفوعة أو دفع عند الاستلام اليوم')
                ->color('success')
                ->icon('heroicon-o-shopping-bag'),

            Stat::make('إجمالي المبيعات', number_format($data['totalRevenue'], 2) . ' ر.س')
                ->description('من إجمالي ' . $data['totalOrders'] . ' طلب')
                ->color('primary')
                ->icon('heroicon-o-banknotes'),

            Stat::make('المنتجات المنشورة', $data['publishedProducts'])
                ->description($data['outOfStockProducts'] > 0 ? "{$data['outOfStockProducts']} منتج نفدت كميته" : 'كل المنتجات متوفرة بالمخزون')
                ->color($data['outOfStockProducts'] > 0 ? 'warning' : 'success')
                ->icon('heroicon-o-cube'),

            Stat::make('العملاء المسجلون', $data['customersCount'])
                ->description('حسابات العملاء في المتجر')
                ->color('info')
                ->icon('heroicon-o-users'),
        ];
    }
}
