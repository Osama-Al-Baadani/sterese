<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class HomeSectionBanner extends Model
{
    protected $fillable = [
        'home_section_id',
        'platform',
        'image_path',
        'external_url',
        'link_type',
        'link_value',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function homeSection()
    {
        return $this->belongsTo(HomeSection::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        if ($this->image_path) {
            return Storage::disk('public')->url($this->image_path);
        }
        return $this->external_url;
    }
}
