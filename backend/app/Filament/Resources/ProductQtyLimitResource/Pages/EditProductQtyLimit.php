<?php

namespace App\Filament\Resources\ProductQtyLimitResource\Pages;

use App\Filament\Resources\ProductQtyLimitResource;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Cache;

class EditProductQtyLimit extends EditRecord
{
    protected static string $resource = ProductQtyLimitResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterSave(): void
    {
        Cache::forget('app_config');
    }
}
