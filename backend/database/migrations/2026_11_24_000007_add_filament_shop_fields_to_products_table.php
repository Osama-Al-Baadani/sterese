<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'cost_price')) {
                $table->decimal('cost_price', 10, 2)->nullable()->after('sale_price');
            }
            if (!Schema::hasColumn('products', 'security_stock')) {
                $table->unsignedInteger('security_stock')->default(5)->after('stock_quantity');
            }
            if (!Schema::hasColumn('products', 'backorder')) {
                $table->boolean('backorder')->default(false)->after('manage_stock');
            }
            if (!Schema::hasColumn('products', 'requires_shipping')) {
                $table->boolean('requires_shipping')->default(true)->after('backorder');
            }
            if (!Schema::hasColumn('products', 'weight_value')) {
                $table->decimal('weight_value', 10, 2)->nullable()->after('requires_shipping');
                $table->string('weight_unit', 10)->default('kg')->after('weight_value');
                $table->decimal('height_value', 10, 2)->nullable()->after('weight_unit');
                $table->decimal('width_value', 10, 2)->nullable()->after('height_value');
                $table->decimal('depth_value', 10, 2)->nullable()->after('width_value');
                $table->string('dimension_unit', 10)->default('cm')->after('depth_value');
            }
            if (!Schema::hasColumn('products', 'published_at')) {
                $table->date('published_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $cols = array_filter([
                'cost_price',
                'security_stock',
                'backorder',
                'requires_shipping',
                'weight_value',
                'weight_unit',
                'height_value',
                'width_value',
                'depth_value',
                'dimension_unit',
                'published_at',
            ], fn ($c) => Schema::hasColumn('products', $c));

            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};
