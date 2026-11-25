<?php

namespace App\Filament\Resources\HomeDepartmentResource\Pages;

use App\Filament\Resources\HomeDepartmentResource;
use Filament\Resources\Pages\CreateRecord;

class CreateHomeDepartment extends CreateRecord
{
    protected static string $resource = HomeDepartmentResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
