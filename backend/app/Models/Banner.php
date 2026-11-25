<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Banner extends Model
{
    protected $fillable = [
        'type',
        'title_ar',
        'subtitle_ar',
        'image_path',
        'external_url',
        'link_type',
        'link_value',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function getImageUrlAttribute(): ?string
    {
        if ($this->image_path) {
            return Storage::disk('public')->url($this->image_path);
        }
        return $this->external_url;
    }
}
