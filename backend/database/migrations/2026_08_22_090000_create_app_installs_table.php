<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_installs', function (Blueprint $table) {
            $table->id();
            $table->string('device_id')->unique();
            $table->string('platform')->nullable();
            $table->string('app_version')->nullable();
            $table->string('media_source')->nullable();
            $table->string('campaign')->nullable();
            $table->timestamp('first_seen_at')->useCurrent();
            $table->timestamp('last_seen_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_installs');
    }
};
