<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_section_banners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('home_section_id')->constrained()->cascadeOnDelete();
            $table->string('image_path', 500)->nullable();
            $table->string('external_url', 500)->nullable();
            $table->string('link_type', 30)->default('none');
            $table->string('link_value', 300)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('home_sections', function (Blueprint $table) {
            $table->dropColumn(['banner_url', 'banner_image_path', 'banner_link_type', 'banner_link_value']);
        });
    }

    public function down(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            $table->string('banner_url', 500)->nullable();
            $table->string('banner_image_path', 500)->nullable();
            $table->string('banner_link_type', 30)->default('none');
            $table->string('banner_link_value', 300)->nullable();
        });

        Schema::dropIfExists('home_section_banners');
    }
};
