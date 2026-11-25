<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->boolean('welcome_offer_active')->default(false)->after('gift_label');
            $table->enum('welcome_offer_type', ['discount', 'gift'])->default('discount')->after('welcome_offer_active');
            $table->unsignedTinyInteger('welcome_offer_discount_percent')->default(15)->after('welcome_offer_type');
            $table->float('welcome_offer_discount_min_order')->default(0)->after('welcome_offer_discount_percent');
            $table->unsignedSmallInteger('welcome_offer_expiry_days')->default(3)->after('welcome_offer_discount_min_order');
            $table->unsignedBigInteger('welcome_offer_gift_product_id')->nullable()->after('welcome_offer_expiry_days');
            $table->string('welcome_offer_gift_product_name')->nullable()->after('welcome_offer_gift_product_id');
            $table->string('welcome_offer_gift_image')->nullable()->after('welcome_offer_gift_product_name');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn([
                'welcome_offer_active', 'welcome_offer_type',
                'welcome_offer_discount_percent', 'welcome_offer_discount_min_order',
                'welcome_offer_expiry_days',
                'welcome_offer_gift_product_id', 'welcome_offer_gift_product_name', 'welcome_offer_gift_image',
            ]);
        });
    }
};
