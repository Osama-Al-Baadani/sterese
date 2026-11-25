<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The `payments` table was originally built for a Moyasar integration
 * (moyasar_id, moyasar_response, callback_url). The app was later rewritten
 * to use PayMob, and the model/migration source were updated to match —
 * but the live table was never actually migrated, so it still has the old
 * Moyasar columns and is missing paymob_order_id/paymob_response entirely.
 * This is why PayMob order creation crashed with "no column named
 * paymob_order_id". Adding the missing columns here rather than renaming
 * the old ones, since renaming is riskier on SQLite and the old columns
 * are simply unused dead weight, not something anything still reads.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'paymob_order_id')) {
                $table->string('paymob_order_id')->nullable()->index()->after('order_id');
            }
            if (!Schema::hasColumn('payments', 'paymob_transaction_id')) {
                $table->string('paymob_transaction_id')->nullable()->unique()->after('paymob_order_id');
            }
            if (!Schema::hasColumn('payments', 'paymob_response')) {
                $table->json('paymob_response')->nullable()->after('currency');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['paymob_order_id', 'paymob_transaction_id', 'paymob_response']);
        });
    }
};
