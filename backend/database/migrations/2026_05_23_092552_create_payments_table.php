<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('paymob_order_id')->nullable()->index();
            $table->string('paymob_transaction_id')->nullable()->unique();
            $table->string('status');
            $table->string('payment_method')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('SAR');
            $table->json('paymob_response')->nullable();
            $table->string('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
