<?php

namespace App\Filament\Widgets;

use App\Models\AppInstall;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class AppInstallsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $installsToday = AppInstall::whereDate('first_seen_at', today())->count();
        $installsWeek  = AppInstall::where('first_seen_at', '>=', now()->subDays(7))->count();
        $installsMonth = AppInstall::where('first_seen_at', '>=', now()->subDays(30))->count();

        $active24h = AppInstall::where('last_seen_at', '>=', now()->subHours(24))->count();
        $active7d  = AppInstall::where('last_seen_at', '>=', now()->subDays(7))->count();
        $active30d = AppInstall::where('last_seen_at', '>=', now()->subDays(30))->count();

        return [
            Stat::make('تثبيتات جديدة اليوم', $installsToday)
                ->color('success')
                ->icon('heroicon-o-arrow-down-tray'),
            Stat::make('تثبيتات آخر 7 أيام', $installsWeek)
                ->color('success')
                ->icon('heroicon-o-arrow-down-tray'),
            Stat::make('تثبيتات آخر 30 يوم', $installsMonth)
                ->color('success')
                ->icon('heroicon-o-arrow-down-tray'),

            Stat::make('نشطون آخر 24 ساعة', $active24h)
                ->color('primary')
                ->icon('heroicon-o-signal'),
            Stat::make('نشطون آخر 7 أيام', $active7d)
                ->color('primary')
                ->icon('heroicon-o-signal'),
            Stat::make('نشطون آخر 30 يوم', $active30d)
                ->color('primary')
                ->icon('heroicon-o-signal'),
        ];
    }
}
