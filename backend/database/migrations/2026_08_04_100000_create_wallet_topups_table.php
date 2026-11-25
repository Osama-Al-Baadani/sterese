<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_topups', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('customer_id')->index();
            $table->decimal('amount', 10, 2);
            $table->string('status')->default('pending'); // pending | paid | failed
            $table->string('source'); // paymob_intention | woo_order
            $table->string('paymob_order_id')->nullable()->unique();
            $table->string('paymob_transaction_id')->nullable();
            $table->string('woo_order_id')->nullable()->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_topups');
    }
};
