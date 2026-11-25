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
        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->string('image_path')->nullable();    // مسار الصورة المرفوعة على السيرفر
            $table->string('external_url')->nullable();  // رابط صورة خارجي (بديل اختياري)
            $table->string('link_type')->default('none'); // none | category | search
            $table->string('link_value')->nullable();    // category ID أو كلمة البحث
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
        Schema::dropIfExists('banners');
    }
};
