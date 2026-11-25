<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('attribution_source')->nullable()->after('payment_method');
            $table->string('attribution_media_source')->nullable()->after('attribution_source');
            $table->string('attribution_campaign')->nullable()->after('attribution_media_source');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['attribution_source', 'attribution_media_source', 'attribution_campaign']);
        });
    }
};
