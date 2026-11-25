<?php

namespace App\Filament\Resources\OfferPageResource\Pages;

use App\Filament\Resources\OfferPageResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Cache;

class CreateOfferPage extends CreateRecord
{
    protected static string $resource = OfferPageResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterCreate(): void
    {
        Cache::forget('app_config');
    }
}
