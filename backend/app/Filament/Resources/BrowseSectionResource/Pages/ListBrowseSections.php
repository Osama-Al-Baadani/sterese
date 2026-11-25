<?php

namespace App\Filament\Resources\BrowseSectionResource\Pages;

use App\Filament\Resources\BrowseSectionResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListBrowseSections extends ListRecords
{
    protected static string $resource = BrowseSectionResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('إضافة قسم تصفح'),
        ];
    }
}
