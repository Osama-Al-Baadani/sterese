<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Requires a real cron entry calling `php artisan schedule:run` every
// minute — this file only defines *what* runs, not a trigger by itself.
Schedule::command('cart:remind-abandoned')->everyFiveMinutes();

// WooCommerce's own cleanup for this stopped running (no reliable cron on
// this host), which is exactly what filled the MySQL database to ~90% of
// its quota. Reuses the same schedule:run trigger above — no separate cron
// entry needed.
Schedule::command('woocommerce:clean-action-scheduler')->weekly();
