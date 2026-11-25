<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 300);
            $table->string('name_en', 300)->nullable();
            $table->string('slug', 300)->unique();
            $table->unsignedBigInteger('parent_id')->nullable()->index();
            $table->text('description')->nullable();
            $table->string('image_path', 1000)->nullable();
            $table->string('external_image_url', 1000)->nullable();
            $table->integer('sort_order')->default(0)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedBigInteger('woo_category_id')->nullable()->unique();
            $table->timestamps();

            $table->foreign('parent_id')
                ->references('id')
                ->on('categories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
