<?php

use App\Http\Controllers\PrintOrderController;
use App\Http\Controllers\PrintAbandonedCartController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/orders/{id}/print', PrintOrderController::class)->name('orders.print');
Route::get('/abandoned-carts/{id}/print', PrintAbandonedCartController::class)->name('abandoned-cart.print');

// Fallback static server when public/storage symlink is absent (e.g. Windows without elevated symlink privilege)
Route::get('/storage/{path}', function (string $path) {
    $disk = Storage::disk('public');
    abort_unless(!str_contains($path, '..') && $disk->exists($path), 404);

    return $disk->response($path, null, [
        'Cache-Control' => 'public, max-age=31536000, immutable',
    ]);
})->where('path', '.*');
