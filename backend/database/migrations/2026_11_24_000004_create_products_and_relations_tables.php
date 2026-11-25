<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_setting_id')
                ->nullable()
                ->constrained('brand_settings')
                ->nullOnDelete();

            $table->string('name', 500);
            $table->string('name_en', 500)->nullable();
            $table->string('slug', 500)->unique();
            $table->string('sku', 100)->nullable()->index();
            $table->string('barcode', 100)->nullable()->index();
            $table->string('unit', 50)->nullable();
            $table->unsignedInteger('bundle_qty')->nullable();

            $table->string('type', 20)->default('simple')->index();     // simple | variable
            $table->string('status', 20)->default('publish')->index();  // publish | draft | private
            $table->boolean('featured')->default(false)->index();

            $table->text('short_description')->nullable();
            $table->text('short_description_en')->nullable();
            $table->longText('description')->nullable();
            $table->longText('description_en')->nullable();

            $table->decimal('price', 10, 2)->default(0)->index();
            $table->decimal('regular_price', 10, 2)->default(0);
            $table->decimal('sale_price', 10, 2)->nullable();
            $table->boolean('on_sale')->default(false)->index();

            $table->string('stock_status', 20)->default('instock')->index(); // instock | outofstock
            $table->integer('stock_quantity')->nullable();
            $table->boolean('manage_stock')->default(false);

            $table->decimal('average_rating', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->unsignedInteger('total_sales')->default(0)->index();
            $table->integer('sort_order')->default(0)->index();

            $table->json('images')->nullable();
            $table->json('related_product_ids')->nullable();

            $table->unsignedBigInteger('woo_product_id')->nullable()->unique();
            $table->timestamps();
        });

        Schema::create('product_category', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();

            $table->primary(['product_id', 'category_id']);
            $table->index('category_id');
        });

        Schema::create('product_tag', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained('tags')->cascadeOnDelete();

            $table->primary(['product_id', 'tag_id']);
            $table->index('tag_id');
        });

        Schema::create('product_variations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 100)->nullable()->index();
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('regular_price', 10, 2)->default(0);
            $table->decimal('sale_price', 10, 2)->nullable();
            $table->string('stock_status', 20)->default('instock');
            $table->integer('stock_quantity')->nullable();
            $table->string('image_path', 1000)->nullable();
            $table->string('external_image_url', 1000)->nullable();
            $table->json('attributes')->nullable(); // [{"attribute": "الحجم", "value": "1 لتر"}]
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variations');
        Schema::dropIfExists('product_tag');
        Schema::dropIfExists('product_category');
        Schema::dropIfExists('products');
    }
};
