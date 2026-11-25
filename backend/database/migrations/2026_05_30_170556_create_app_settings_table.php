<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();

            // ── أسعار التوصيل ──────────────────────────────────────────────
            $table->decimal('delivery_fee', 8, 2)->default(25.00);
            $table->decimal('free_shipping_threshold', 8, 2)->default(100.00);
            $table->decimal('min_order_value', 8, 2)->default(35.00);

            // ── معلومات التواصل ────────────────────────────────────────────
            $table->string('whatsapp_phone')->default('966545555340');
            $table->string('support_phone')->default('966545555340');
            $table->string('support_email')->default('order@storeseco.com');
            $table->string('working_hours_weekday')->default('السبت – الخميس: 8:00 ص – 11:00 م');
            $table->string('working_hours_friday')->default('الجمعة: 2:00 م – 11:00 م');

            // ── شريط الإعلان ──────────────────────────────────────────────
            $table->boolean('announcement_active')->default(false);
            $table->string('announcement_text')->default('');

            // ── شعارات الثقة (4 شعارات) ────────────────────────────────
            $table->string('badge1_label')->default('توصيل سريع');
            $table->string('badge2_label')->default('دفع آمن');
            $table->string('badge3_label')->default('إرجاع مجاني');
            $table->string('badge4_label')->default('جودة مضمونة');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
