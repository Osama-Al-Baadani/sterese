<?php

namespace App\Filament\Resources\OfferPageResource\Pages;

use App\Filament\Resources\OfferPageResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Cache;

class EditOfferPage extends EditRecord
{
    protected static string $resource = OfferPageResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()->label('حذف')];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterSave(): void
    {
        Cache::forget('app_config');
    }
}
