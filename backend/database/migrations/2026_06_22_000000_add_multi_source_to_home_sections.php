<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            // JSON array of WC category or tag IDs (replaces single source_id)
            $table->text('source_ids')->nullable()->after('source_id');
            // JSON array of specific WC product IDs to display (overrides category-based)
            $table->text('product_ids')->nullable()->after('source_ids');
        });
    }

    public function down(): void
    {
        Schema::table('home_sections', function (Blueprint $table) {
            $table->dropColumn(['source_ids', 'product_ids']);
        });
    }
};
