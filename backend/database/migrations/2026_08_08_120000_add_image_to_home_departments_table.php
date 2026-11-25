<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_departments', function (Blueprint $table) {
            // Only meaningful for source_type = 'tag' — categories already
            // have their own image from WooCommerce.
            $table->string('image_path')->nullable()->after('icon');
            $table->string('external_url')->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('home_departments', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'external_url']);
        });
    }
};
