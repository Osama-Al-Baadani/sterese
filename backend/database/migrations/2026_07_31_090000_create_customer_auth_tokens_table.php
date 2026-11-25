<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every customer-scoped endpoint (wallet, profile, orders, addresses)
     * previously had no way at all to verify the caller actually owns the
     * customer_id/phone it was asking about. Login/registration now issue an
     * opaque token here; customer-scoped routes require it and check it
     * resolves to the same customer_id being accessed.
     */
    public function up(): void
    {
        Schema::create('customer_auth_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('token', 80)->unique();
            $table->unsignedBigInteger('customer_id')->index();
            $table->string('phone', 30)->nullable()->index();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_auth_tokens');
    }
};
