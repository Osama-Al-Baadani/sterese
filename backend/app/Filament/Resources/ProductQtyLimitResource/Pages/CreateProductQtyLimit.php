<?php

namespace App\Filament\Resources\ProductQtyLimitResource\Pages;

use App\Filament\Resources\ProductQtyLimitResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Cache;

class CreateProductQtyLimit extends CreateRecord
{
    protected static string $resource = ProductQtyLimitResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterCreate(): void
    {
        Cache::forget('app_config');
    }
}
