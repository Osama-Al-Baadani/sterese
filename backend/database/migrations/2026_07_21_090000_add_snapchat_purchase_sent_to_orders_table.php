<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // يمنع إرسال حدث الشراء لسناب شات أكثر من مرة لنفس الطلب
            // (WooCommerce يرسل الـ webhook أكثر من مرة لنفس الطلب أحياناً)
            $table->boolean('snapchat_purchase_sent')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('snapchat_purchase_sent');
        });
    }
};
