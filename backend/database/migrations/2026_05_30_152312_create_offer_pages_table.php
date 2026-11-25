<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('offer_pages', function (Blueprint $table) {
            $table->id();
            $table->string('label');                    // الاسم في التطبيق مثل: المواد الغذائية
            $table->unsignedInteger('tag_id');           // WooCommerce tag ID
            $table->string('icon')->default('shopping_basket_rounded'); // اسم الأيقونة
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offer_pages');
    }
};
