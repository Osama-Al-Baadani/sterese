<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brand_settings', function (Blueprint $table) {
            $table->unsignedBigInteger('woo_brand_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('brand_settings', function (Blueprint $table) {
            $table->unsignedBigInteger('woo_brand_id')->nullable(false)->change();
        });
    }
};
