<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use Filament\Resources\Pages\CreateRecord;

class CreateProduct extends CreateRecord
{
    protected static string $resource = ProductResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $localFiles = array_values(array_filter(
            is_array($data['images'] ?? null) ? $data['images'] : [],
            fn ($v) => is_string($v) && trim($v) !== ''
        ));

        $externalUrls = [];
        foreach (($data['external_image_urls'] ?? []) as $item) {
            $url = trim((string) (is_array($item) ? ($item['url'] ?? '') : $item));
            if ($url !== '' && (str_starts_with($url, 'http://') || str_starts_with($url, 'https://'))) {
                $externalUrls[] = $url;
            }
        }

        $data['images'] = array_values(array_unique(array_merge($localFiles, $externalUrls)));
        unset($data['external_image_urls']);

        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
