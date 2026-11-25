<?php

namespace App\Filament\Exports;

use App\Models\Category;
use Filament\Actions\Exports\ExportColumn;
use Filament\Actions\Exports\Exporter;
use Filament\Actions\Exports\Models\Export;

class CategoryExporter extends Exporter
{
    protected static ?string $model = Category::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('id')->label('ID'),
            ExportColumn::make('name')->label('اسم القسم (عربي)'),
            ExportColumn::make('name_en')->label('اسم القسم (إنجليزي)'),
            ExportColumn::make('slug')->label('الرابط (Slug)'),
            ExportColumn::make('parent.name')->label('القسم الأب'),
            ExportColumn::make('description')->label('الوصف'),
            ExportColumn::make('image_url')->label('رابط الصورة'),
            ExportColumn::make('sort_order')->label('الترتيب'),
            ExportColumn::make('is_active')
                ->label('مفعّل')
                ->formatStateUsing(fn ($state) => $state ? '1' : '0'),
        ];
    }

    public static function getCompletedNotificationBody(Export $export): string
    {
        $count = number_format($export->successful_rows);
        $body = "تم تصدير {$count} قسم بنجاح.";

        if ($failedRowsCount = $export->getFailedRowsCount()) {
            $body .= ' فشل تصدير ' . number_format($failedRowsCount) . ' صف.';
        }

        return $body;
    }
}
