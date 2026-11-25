<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            // Optional marketing banner shown above the section
            $table->string('banner_url', 500)->nullable()->after('products_limit');
            // Deep link (e.g. /browse?category=123) or external URL
            $table->string('banner_link', 300)->nullable()->after('banner_url');
        });
    }

    public function down(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            $table->dropColumn(['banner_url', 'banner_link']);
        });
    }
};
