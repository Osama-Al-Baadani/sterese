<?php

namespace App\Filament\Resources\PhoneOtpResource\Pages;

use App\Filament\Exports\PhoneOtpExporter;
use App\Filament\Resources\PhoneOtpResource;
use Filament\Actions\ExportAction;
use Filament\Resources\Pages\ListRecords;

class ListPhoneOtps extends ListRecords
{
    protected static string $resource = PhoneOtpResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ExportAction::make()
                ->label('تصدير Excel')
                ->exporter(PhoneOtpExporter::class),
        ];
    }
}
