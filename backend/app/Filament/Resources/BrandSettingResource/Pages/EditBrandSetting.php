<?php

namespace App\Filament\Resources\BrandSettingResource\Pages;

use App\Filament\Resources\BrandSettingResource;
use Filament\Resources\Pages\EditRecord;

class EditBrandSetting extends EditRecord
{
    protected static string $resource = BrandSettingResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
