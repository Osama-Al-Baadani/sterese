<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_sections', function (Blueprint $table) {
            $table->id();
            $table->string('title', 100);
            $table->string('icon', 20)->default('📦');
            // category | tag | bestsellers | featured
            $table->string('source_type', 20)->default('category');
            // WooCommerce category ID or tag ID (null for bestsellers/featured)
            $table->unsignedInteger('source_id')->nullable();
            $table->boolean('visible')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->unsignedSmallInteger('products_limit')->default(10);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_sections');
    }
};
