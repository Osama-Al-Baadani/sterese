<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HomeSection;
use App\Models\HomeSectionBanner;
use Illuminate\Http\JsonResponse;

class HomeSectionController extends Controller
{
    public function index(): JsonResponse
    {
        $sections = HomeSection::with('banners')
            ->where('visible', true)
            ->orderBy('sort_order')
            ->get()
            ->map(function (HomeSection $s) {
                $appBanners = $s->banners
                    ->filter(fn (HomeSectionBanner $b) => in_array($b->platform ?? 'both', ['both', 'app'], true))
                    ->map(fn (HomeSectionBanner $b) => $this->formatBanner($b))
                    ->values()
                    ->all();

                $webBanners = $s->banners
                    ->filter(fn (HomeSectionBanner $b) => in_array($b->platform ?? 'both', ['both', 'web'], true))
                    ->map(fn (HomeSectionBanner $b) => $this->formatBanner($b))
                    ->values()
                    ->all();

                $sourceIds = $s->source_ids ?? ($s->source_id ? [(int) $s->source_id] : []);

                return [
                    'id'              => $s->id,
                    'title'           => $s->title,
                    'icon'            => $s->icon,
                    'source_type'     => $s->source_type,
                    'source_id'       => $s->source_id,
                    'source_ids'      => array_map('intval', $sourceIds),
                    'source_slugs'    => $s->source_slugs ?? [],
                    'product_ids'     => array_map('intval', $s->product_ids ?? []),
                    'products_limit'  => (int) $s->products_limit,
                    'sort_by'         => $s->sort_by ?? 'default',
                    'banner_url'      => $appBanners[0]['image_url'] ?? '',
                    'banner_link'     => $appBanners[0]['link'] ?? '',
                    'banner_url_web'  => $webBanners[0]['image_url'] ?? '',
                    'banner_link_web' => $webBanners[0]['link'] ?? '',
                    'banners'         => $appBanners,
                    'banners_web'     => $webBanners,
                ];
            });

        return response()->json(['sections' => $sections]);
    }

    private function formatBanner(HomeSectionBanner $b): array
    {
        $linkType = $b->link_type ?? 'none';
        $linkVal  = $b->link_value ?? '';

        $link = match ($linkType) {
            'category', 'classification' => $linkVal !== '' ? '/browse?category=' . rawurlencode($linkVal) : null,
            'brand'                      => $linkVal !== '' ? '/browse?brand=' . rawurlencode($linkVal) : null,
            'tag'                        => $linkVal !== '' ? '/browse?tag=' . rawurlencode($linkVal) : null,
            'search'                     => $linkVal !== '' ? '/browse?search=' . rawurlencode($linkVal) : null,
            default                      => null,
        };

        return [
            'image_url'  => $b->image_url ?? '',
            'link'       => $link,
            'link_type'  => $linkType,
            'link_value' => $linkVal,
        ];
    }
}
