<?php

namespace App\Http\Controllers;

use App\Models\AbandonedCart;
use Illuminate\Http\Response;

class PrintAbandonedCartController extends Controller
{
    public function __invoke(int $id): Response
    {
        $cart = AbandonedCart::findOrFail($id);
        $html = view('abandoned-carts.print', compact('cart'))->render();

        return response($html)->header('Content-Type', 'text/html; charset=utf-8');
    }
}
