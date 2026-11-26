<?php

namespace App\Filament\Widgets;

use App\Models\AppInstall;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Cache;

class AppInstallsOverview extends BaseWidget
{
    protected ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $data = Cache::remember('dashboard_app_installs_overview_v1', 60, function (): array {
            $today = today()->toDateString();
            $d7    = now()->subDays(7)->toDateTimeString();
            $d30   = now()->subDays(30)->toDateTimeString();
            $h24   = now()->subHours(24)->toDateTimeString();

            $agg = AppInstall::query()
                ->selectRaw("
                    COALESCE(SUM(CASE WHEN DATE(first_seen_at) = ? THEN 1 ELSE 0 END), 0) as installs_today,
                    COALESCE(SUM(CASE WHEN first_seen_at >= ? THEN 1 ELSE 0 END), 0) as installs_week,
                    COALESCE(SUM(CASE WHEN first_seen_at >= ? THEN 1 ELSE 0 END), 0) as installs_month,
                    COALESCE(SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END), 0) as active_24h,
                    COALESCE(SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END), 0) as active_7d,
                    COALESCE(SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END), 0) as active_30d
                ", [$today, $d7, $d30, $h24, $d7, $d30])
                ->first();

            return [
                'installsToday' => (int) ($agg->installs_today ?? 0),
                'installsWeek'  => (int) ($agg->installs_week ?? 0),
                'installsMonth' => (int) ($agg->installs_month ?? 0),
                'active24h'     => (int) ($agg->active_24h ?? 0),
                'active7d'      => (int) ($agg->active_7d ?? 0),
                'active30d'     => (int) ($agg->active_30d ?? 0),
            ];
        });

        return [
            Stat::make('تثبيتات جديدة اليوم', $data['installsToday'])
                ->color('success')
                ->icon('heroicon-o-arrow-down-tray'),
            Stat::make('تثبيتات آخر 7 أيام', $data['installsWeek'])
                ->color('success')
                ->icon('heroicon-o-arrow-down-tray'),
            Stat::make('تثبيتات آخر 30 يوم', $data['installsMonth'])
                ->color('success')
                ->icon('heroicon-o-arrow-down-tray'),

            Stat::make('نشطون آخر 24 ساعة', $data['active24h'])
                ->color('primary')
                ->icon('heroicon-o-signal'),
            Stat::make('نشطون آخر 7 أيام', $data['active7d'])
                ->color('primary')
                ->icon('heroicon-o-signal'),
            Stat::make('نشطون آخر 30 يوم', $data['active30d'])
                ->color('primary')
                ->icon('heroicon-o-signal'),
        ];
    }
}
