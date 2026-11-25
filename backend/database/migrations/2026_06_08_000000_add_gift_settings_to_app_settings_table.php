<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            // ── إعدادات الهدية المجانية ────────────────────────────────────
            $table->boolean('gift_enabled')->default(true)->after('badge4_label');
            $table->unsignedInteger('gift_product_id')->default(175115)->after('gift_enabled');
            $table->decimal('gift_min_amount', 8, 2)->default(200.00)->after('gift_product_id');
            $table->string('gift_label')->default('هدية مجانية')->after('gift_min_amount');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn(['gift_enabled', 'gift_product_id', 'gift_min_amount', 'gift_label']);
        });
    }
};
