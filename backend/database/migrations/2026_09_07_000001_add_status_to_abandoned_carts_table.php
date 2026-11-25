<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('abandoned_carts', function (Blueprint $table) {
            $table->string('status', 20)->default('new')->after('total');
            $table->timestamp('contacted_at')->nullable()->after('status');
            $table->unsignedBigInteger('woo_order_id')->nullable()->after('contacted_at');
        });
    }

    public function down(): void
    {
        Schema::table('abandoned_carts', function (Blueprint $table) {
            $table->dropColumn(['status', 'contacted_at', 'woo_order_id']);
        });
    }
};
