<?php

namespace App\Providers;

use Filament\Support\Facades\FilamentTimezone;
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
    }
}
