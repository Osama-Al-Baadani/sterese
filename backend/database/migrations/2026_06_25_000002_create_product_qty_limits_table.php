<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_qty_limits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('woo_product_id')->unique();
            $table->string('product_name')->default('');
            $table->unsignedInteger('max_qty');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_qty_limits');
    }
};
