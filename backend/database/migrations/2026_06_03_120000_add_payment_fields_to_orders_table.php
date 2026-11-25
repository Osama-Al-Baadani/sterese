<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('wallet_amount', 10, 2)->default(0)->after('discount');
            $table->unsignedInteger('woo_customer_id')->nullable()->after('wallet_amount');
            $table->string('delivery_type', 100)->nullable()->after('woo_customer_id');
            $table->string('gps_coordinates', 100)->nullable()->after('delivery_type');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['wallet_amount', 'woo_customer_id', 'delivery_type', 'gps_coordinates']);
        });
    }
};
