<?php

namespace App\Filament\Resources\OfferPageResource\Pages;

use App\Filament\Resources\OfferPageResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListOfferPages extends ListRecords
{
    protected static string $resource = OfferPageResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()->label('إضافة صفحة عروض')];
    }
}
