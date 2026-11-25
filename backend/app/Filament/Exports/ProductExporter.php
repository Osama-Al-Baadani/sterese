<?php

namespace App\Filament\Exports;

use App\Models\Product;
use Filament\Actions\Exports\ExportColumn;
use Filament\Actions\Exports\Exporter;
use Filament\Actions\Exports\Models\Export;

class ProductExporter extends Exporter
{
    protected static ?string $model = Product::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('id')->label('ID'),
            ExportColumn::make('name')->label('اسم المنتج (عربي)'),
            ExportColumn::make('name_en')->label('اسم المنتج (إنجليزي)'),
            ExportColumn::make('slug')->label('الرابط (Slug)'),
            ExportColumn::make('sku')->label('SKU'),
            ExportColumn::make('barcode')->label('الباركود'),
            ExportColumn::make('unit')->label('الوحدة'),
            ExportColumn::make('bundle_qty')->label('كمية الحزمة'),
            ExportColumn::make('type')->label('النوع'),
            ExportColumn::make('status')->label('حالة النشر'),
            ExportColumn::make('featured')
                ->label('مميز')
                ->formatStateUsing(fn ($state) => $state ? '1' : '0'),
            ExportColumn::make('regular_price')->label('السعر الأساسي'),
            ExportColumn::make('sale_price')->label('سعر الخصم'),
            ExportColumn::make('cost_price')->label('سعر التكلفة'),
            ExportColumn::make('price')->label('السعر النهائي'),
            ExportColumn::make('stock_status')->label('حالة المخزون'),
            ExportColumn::make('manage_stock')
                ->label('إدارة المخزون')
                ->formatStateUsing(fn ($state) => $state ? '1' : '0'),
            ExportColumn::make('stock_quantity')->label('الكمية المتوفرة'),
            ExportColumn::make('security_stock')->label('حد تنبيه المخزون'),
            ExportColumn::make('weight_value')->label('الوزن (كجم)'),
            ExportColumn::make('published_at')->label('تاريخ النشر'),
            ExportColumn::make('brand.name')->label('البراند'),
            ExportColumn::make('categories_list')
                ->label('الأقسام')
                ->state(fn (Product $record) => $record->categories->pluck('name')->implode(', ')),
            ExportColumn::make('tags_list')
                ->label('الوسوم')
                ->state(fn (Product $record) => $record->tags->pluck('name')->implode(', ')),
            ExportColumn::make('images_list')
                ->label('روابط الصور')
                ->state(fn (Product $record) => implode(', ', $record->resolvedImageUrls())),
            ExportColumn::make('short_description')->label('وصف مختصر (عربي)'),
            ExportColumn::make('short_description_en')->label('وصف مختصر (إنجليزي)'),
            ExportColumn::make('description')->label('الوصف الكامل (عربي)'),
            ExportColumn::make('description_en')->label('الوصف الكامل (إنجليزي)'),
            ExportColumn::make('sort_order')->label('الترتيب'),
            ExportColumn::make('total_sales')->label('المبيعات'),
            ExportColumn::make('created_at')->label('تاريخ الإضافة'),
        ];
    }

    public static function getCompletedNotificationBody(Export $export): string
    {
        $count = number_format($export->successful_rows);
        $body = "تم تصدير {$count} منتج بنجاح. اضغط على زر التحميل أدناه لحفظ الملف.";

        if ($failedRowsCount = $export->getFailedRowsCount()) {
            $body .= ' فشل تصدير ' . number_format($failedRowsCount) . ' صف.';
        }

        return $body;
    }
}
