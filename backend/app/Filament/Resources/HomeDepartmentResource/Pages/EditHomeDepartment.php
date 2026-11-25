<?php

namespace App\Filament\Resources\HomeDepartmentResource\Pages;

use App\Filament\Resources\HomeDepartmentResource;
use Filament\Resources\Pages\EditRecord;

class EditHomeDepartment extends EditRecord
{
    protected static string $resource = HomeDepartmentResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
