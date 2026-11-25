<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('welcome_offer_claims', function (Blueprint $table) {
            $table->id();
            $table->string('phone')->unique();
            $table->string('coupon_code');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('welcome_offer_claims');
    }
};
