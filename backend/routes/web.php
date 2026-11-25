<?php

use App\Http\Controllers\PrintOrderController;
use App\Http\Controllers\PrintAbandonedCartController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/orders/{id}/print', PrintOrderController::class)->name('orders.print');
Route::get('/abandoned-carts/{id}/print', PrintAbandonedCartController::class)->name('abandoned-cart.print');
