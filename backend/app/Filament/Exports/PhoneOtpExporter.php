<?php

namespace App\Filament\Exports;

use App\Models\PhoneOtp;
use Filament\Actions\Exports\ExportColumn;
use Filament\Actions\Exports\Exporter;
use Filament\Actions\Exports\Models\Export;

class PhoneOtpExporter extends Exporter
{
    protected static ?string $model = PhoneOtp::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('phone')->label('الجوال'),
            ExportColumn::make('code')->label('الرمز'),
            ExportColumn::make('attempts')->label('المحاولات الخاطئة'),
            ExportColumn::make('expires_at')->label('ينتهي في'),
            ExportColumn::make('consumed_at')->label('تم استخدامه في'),
            ExportColumn::make('created_at')->label('وقت الإرسال'),
        ];
    }

    public static function getCompletedNotificationBody(Export $export): string
    {
        $count = number_format($export->successful_rows);
        $body = "تم تصدير {$count} صف بنجاح.";

        if ($failedRowsCount = $export->getFailedRowsCount()) {
            $body .= ' فشل تصدير ' . number_format($failedRowsCount) . ' صف.';
        }

        return $body;
    }
}
