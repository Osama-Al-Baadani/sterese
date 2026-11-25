<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Response;

class PrintOrderController extends Controller
{
    public function __invoke(int $id): Response
    {
        $order = Order::findOrFail($id);
        $html  = view('orders.print', compact('order'))->render();

        return response($html)->header('Content-Type', 'text/html; charset=utf-8');
    }
}
