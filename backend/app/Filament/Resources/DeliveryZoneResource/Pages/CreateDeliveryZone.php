<?php

namespace App\Filament\Resources\DeliveryZoneResource\Pages;

use App\Filament\Resources\DeliveryZoneResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Cache;

class CreateDeliveryZone extends CreateRecord
{
    protected static string $resource = DeliveryZoneResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterCreate(): void
    {
        Cache::forget('app_config');
    }
}
