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
        Schema::table('banners', function (Blueprint $table) {
            // carousel = بنر كبير في الأعلى | promo = كارد صغير في المنتصف
            $table->string('type')->default('carousel')->after('id');
            $table->string('title_ar')->nullable()->after('type');
            $table->string('subtitle_ar')->nullable()->after('title_ar');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['type', 'title_ar', 'subtitle_ar']);
        });
    }
};
