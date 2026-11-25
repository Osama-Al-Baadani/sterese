<?php

namespace App\Filament\Resources\BrowseSectionResource\Pages;

use App\Filament\Resources\BrowseSectionResource;
use Filament\Resources\Pages\EditRecord;

class EditBrowseSection extends EditRecord
{
    protected static string $resource = BrowseSectionResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
