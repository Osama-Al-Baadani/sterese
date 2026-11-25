<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('cities')->nullable();          // قائمة المدن
            $table->decimal('base_fee', 8, 2)->default(25);
            $table->decimal('free_threshold', 8, 2)->default(0); // 0 = بدون حد مجاني خاص
            $table->boolean('promo_active')->default(false);
            $table->string('promo_type')->nullable();    // 'schedule' | 'first_order'
            $table->dateTime('promo_start')->nullable();
            $table->dateTime('promo_end')->nullable();
            $table->string('promo_label')->default('');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_zones');
    }
};
