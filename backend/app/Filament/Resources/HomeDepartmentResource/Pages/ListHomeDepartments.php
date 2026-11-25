<?php

namespace App\Filament\Resources\HomeDepartmentResource\Pages;

use App\Filament\Resources\HomeDepartmentResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListHomeDepartments extends ListRecords
{
    protected static string $resource = HomeDepartmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('إضافة قسم'),
        ];
    }
}
