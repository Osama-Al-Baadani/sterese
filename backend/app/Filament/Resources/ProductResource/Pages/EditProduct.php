<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditProduct extends EditRecord
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make()->label('حذف المنتج'),
        ];
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $rawImages = is_array($data['images'] ?? null) ? $data['images'] : [];
        $localFiles = [];
        $externalUrls = [];

        foreach ($rawImages as $entry) {
            $src = is_array($entry) ? ($entry['src'] ?? $entry['url'] ?? null) : $entry;
            if (!is_string($src) || trim($src) === '') {
                continue;
            }
            $src = trim($src);
            if (str_starts_with($src, 'http://') || str_starts_with($src, 'https://')) {
                $externalUrls[] = ['url' => $src];
            } else {
                $localFiles[] = $src;
            }
        }

        $data['images'] = $localFiles;
        $data['external_image_urls'] = $externalUrls;

        return $data;
    }

    protected function mutateFormDataBeforeSave(array $data): array
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

    protected function afterSave(): void
    {
        \App\Support\StorefrontCache::bump();
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
