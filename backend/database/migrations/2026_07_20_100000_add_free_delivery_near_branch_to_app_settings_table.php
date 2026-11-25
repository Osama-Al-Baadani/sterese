<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->boolean('free_delivery_near_branch_enabled')->default(false);
            // القيم الافتراضية = موقع الفرع الحالي المكتوب بالتطبيق (lib/screens/map_picker_screen.dart)
            $table->decimal('branch_lat', 10, 6)->default(24.598000);
            $table->decimal('branch_lng', 10, 6)->default(46.639308);
            $table->decimal('free_delivery_radius_km', 5, 2)->default(5);
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn([
                'free_delivery_near_branch_enabled',
                'branch_lat',
                'branch_lng',
                'free_delivery_radius_km',
            ]);
        });
    }
};
