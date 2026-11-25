<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class HomeDepartment extends Model
{
    protected $fillable = [
        'category_id',
        'source_type',
        'title',
        'icon',
        'image_path',
        'external_url',
        'sort_order',
        'visible',
    ];

    protected $casts = [
        'visible' => 'boolean',
    ];

    public function getIconImageUrlAttribute(): ?string
    {
        if ($this->image_path) {
            return Storage::disk('public')->url($this->image_path);
        }
        return $this->external_url;
    }
}
