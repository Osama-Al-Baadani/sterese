<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // توسيع جدول البراندات الحالي بدل إنشاء جدول مكرر
        Schema::table('brand_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('brand_settings', 'name_en')) {
                $table->string('name_en', 300)->nullable()->after('name');
            }
            if (!Schema::hasColumn('brand_settings', 'image_path')) {
                $table->string('image_path', 1000)->nullable()->after('slug');
            }
        });

        // دعم بنرات الويب المستقلة داخل بنرات أقسام الرئيسية بدون تكرار الجدول
        Schema::table('home_section_banners', function (Blueprint $table) {
            if (!Schema::hasColumn('home_section_banners', 'platform')) {
                $table->string('platform', 20)->default('both')->after('home_section_id');
            }
        });

        // إضافة مفتاح الوصول الآمن للطلب ومصدر الطلب لجدول الطلبات الحالي
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'access_key')) {
                $table->string('access_key', 64)->nullable()->index()->after('idempotency_key');
            }
            if (!Schema::hasColumn('orders', 'source')) {
                $table->string('source', 30)->nullable()->after('payment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $cols = array_filter(['access_key', 'source'], fn ($c) => Schema::hasColumn('orders', $c));
            if ($cols) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('home_section_banners', function (Blueprint $table) {
            if (Schema::hasColumn('home_section_banners', 'platform')) {
                $table->dropColumn('platform');
            }
        });

        Schema::table('brand_settings', function (Blueprint $table) {
            $cols = array_filter(['name_en', 'image_path'], fn ($c) => Schema::hasColumn('brand_settings', $c));
            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};
