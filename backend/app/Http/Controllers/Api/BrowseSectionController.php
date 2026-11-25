<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrowseSection;
use Illuminate\Http\JsonResponse;

class BrowseSectionController extends Controller
{
    public function index(): JsonResponse
    {
        $sections = BrowseSection::where('visible', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($s) => [
                'id'                 => $s->id,
                'title'              => $s->title ?? '',
                'parent_category_id' => $s->parent_category_id,
                'sub_category_ids'   => $s->sub_category_ids ?? [],
            ]);

        return response()->json(['sections' => $sections]);
    }
}
