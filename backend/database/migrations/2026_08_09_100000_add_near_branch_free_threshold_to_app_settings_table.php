<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            // Separate from free_shipping_threshold (the general one) —
            // null means "no threshold, always charge near_branch_delivery_fee".
            $table->decimal('near_branch_free_threshold', 8, 2)->nullable()->after('near_branch_delivery_fee');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn('near_branch_free_threshold');
        });
    }
};
