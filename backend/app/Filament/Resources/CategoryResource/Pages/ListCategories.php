<?php

namespace App\Filament\Resources\CategoryResource\Pages;

use App\Filament\Actions\ExcelImportAction;
use App\Filament\Exports\CategoryExporter;
use App\Filament\Imports\CategoryImporter;
use App\Filament\Resources\CategoryResource;
use Filament\Actions\CreateAction;
use Filament\Actions\ExportAction;
use Filament\Resources\Pages\ListRecords;

class ListCategories extends ListRecords
{
    protected static string $resource = CategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->label('+ إضافة قسم جديد'),

            ExcelImportAction::make()
                ->label('استيراد أقسام فقط (Excel / CSV)')
                ->modalHeading('استيراد شجرة الأقسام فقط (بدون منتجات)')
                ->icon('heroicon-o-arrow-up-tray')
                ->color('info')
                ->importer(CategoryImporter::class),

            ExportAction::make()
                ->label('تصدير الأقسام (Excel / CSV)')
                ->icon('heroicon-o-arrow-down-tray')
                ->color('gray')
                ->exporter(CategoryExporter::class),
        ];
    }
}
