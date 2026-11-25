<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->boolean('cod_enabled')->default(false);
            $table->boolean('cod_fee_enabled')->default(false);
            $table->decimal('cod_fee_amount', 8, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn(['cod_enabled', 'cod_fee_enabled', 'cod_fee_amount']);
        });
    }
};
