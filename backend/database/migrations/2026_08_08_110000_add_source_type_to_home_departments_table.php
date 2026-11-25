<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_departments', function (Blueprint $table) {
            // 'category' (default, uses the WooCommerce category's own name
            // + image) or 'tag' (needs its own title/icon below, since
            // WooCommerce tags have no name/image the app already knows).
            $table->string('source_type')->default('category')->after('category_id');
            $table->string('title')->nullable()->after('source_type');
            $table->string('icon')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('home_departments', function (Blueprint $table) {
            $table->dropColumn(['source_type', 'title', 'icon']);
        });
    }
};
