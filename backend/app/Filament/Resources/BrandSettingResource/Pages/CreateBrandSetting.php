<?php

namespace App\Filament\Resources\BrandSettingResource\Pages;

use App\Filament\Resources\BrandSettingResource;
use Filament\Resources\Pages\CreateRecord;

class CreateBrandSetting extends CreateRecord
{
    protected static string $resource = BrandSettingResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Auto-generate a unique woo_brand_id for manually-created brands
        // Use negative IDs to distinguish from real WooCommerce brands
        if (empty($data['woo_brand_id'])) {
            $data['woo_brand_id'] = null;
        }
        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
