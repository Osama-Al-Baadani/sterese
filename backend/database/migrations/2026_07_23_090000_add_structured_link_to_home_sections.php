<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            $table->string('banner_image_path', 500)->nullable()->after('banner_url');
            $table->string('banner_link_type', 30)->default('none')->after('banner_link');
            $table->string('banner_link_value', 300)->nullable()->after('banner_link_type');
        });
    }

    public function down(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            $table->dropColumn(['banner_image_path', 'banner_link_type', 'banner_link_value']);
        });
    }
};
