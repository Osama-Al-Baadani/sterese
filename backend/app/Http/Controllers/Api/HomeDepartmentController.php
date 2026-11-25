<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\HomeDepartment;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;

class HomeDepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = HomeDepartment::where('visible', true)
            ->orderBy('sort_order')
            ->get();

        $catIds = $rows->where('source_type', 'category')->pluck('category_id')->unique()->all();
        $tagIds = $rows->where('source_type', 'tag')->pluck('category_id')->unique()->all();

        $categories = Category::whereIn('id', $catIds)->get()->keyBy('id');
        $tags = Tag::whereIn('id', $tagIds)->get()->keyBy('id');

        $departments = $rows->map(function (HomeDepartment $d) use ($categories, $tags) {
            $title = $d->title;
            $imageUrl = $d->icon_image_url;

            if ($d->source_type === 'category' && ($cat = $categories->get($d->category_id))) {
                $title = $title ?: $cat->name;
                $imageUrl = $imageUrl ?: $cat->image_url;
            } elseif ($d->source_type === 'tag' && ($tag = $tags->get($d->category_id))) {
                $title = $title ?: $tag->name;
            }

            return [
                'source_type' => $d->source_type,
                'id'          => (int) $d->category_id,
                'title'       => $title,
                'icon'        => $d->icon,
                'image_url'   => $imageUrl,
            ];
        })->values();

        return response()->json(['departments' => $departments]);
    }
}
