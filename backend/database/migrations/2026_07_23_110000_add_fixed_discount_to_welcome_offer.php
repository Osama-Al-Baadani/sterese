<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // welcome_offer_type was an enum(['discount','gift']) — SQLite enforces this via
        // a CHECK constraint that can't be altered in place, so swap it for a plain string
        // (preserving existing data) to allow a new 'fixed_discount' value going forward.
        Schema::table('app_settings', function (Blueprint $table) {
            $table->string('welcome_offer_type_new', 20)->default('discount')->after('welcome_offer_type');
        });

        DB::statement('UPDATE app_settings SET welcome_offer_type_new = welcome_offer_type');

        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn('welcome_offer_type');
        });

        Schema::table('app_settings', function (Blueprint $table) {
            $table->renameColumn('welcome_offer_type_new', 'welcome_offer_type');
            $table->float('welcome_offer_discount_amount')->default(20)->after('welcome_offer_discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn('welcome_offer_discount_amount');
        });
    }
};
