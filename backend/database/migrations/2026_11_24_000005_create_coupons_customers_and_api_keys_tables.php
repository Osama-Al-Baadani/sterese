<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('label', 150);
            $table->string('key', 64)->unique();
            $table->string('secret_hash', 255);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('description', 500)->nullable();
            $table->string('type', 20)->default('percent'); // percent | fixed
            $table->decimal('amount', 10, 2)->default(0);
            $table->boolean('free_shipping')->default(false);
            $table->decimal('minimum_amount', 10, 2)->default(0);
            $table->decimal('maximum_amount', 10, 2)->default(0);
            $table->json('product_ids')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('expires_at')->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 150)->default('');
            $table->string('last_name', 150)->default('');
            $table->string('phone', 30)->unique();
            $table->string('email', 255)->nullable();
            $table->string('password', 255)->nullable();
            $table->decimal('wallet_balance', 10, 2)->default(0);
            $table->unsignedBigInteger('woo_customer_id')->nullable()->unique();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('api_keys');
    }
};
