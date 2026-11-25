<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->boolean('promo_popup_active')->default(false)->after('welcome_offer_gift_image');
            $table->string('promo_popup_title')->nullable()->after('promo_popup_active');
            $table->string('promo_popup_description')->nullable()->after('promo_popup_title');
            $table->string('promo_popup_coupon_code')->nullable()->after('promo_popup_description');
            $table->string('promo_popup_expires_label')->nullable()->after('promo_popup_coupon_code');
            $table->string('promo_popup_image')->nullable()->after('promo_popup_expires_label');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn([
                'promo_popup_active', 'promo_popup_title', 'promo_popup_description',
                'promo_popup_coupon_code', 'promo_popup_expires_label', 'promo_popup_image',
            ]);
        });
    }
};
