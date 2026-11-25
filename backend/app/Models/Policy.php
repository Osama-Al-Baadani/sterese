<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Policy extends Model
{
    protected $fillable = ['type', 'title', 'sections'];

    protected $casts = [
        'sections' => 'array',
    ];

    public static function byType(string $type): ?static
    {
        return static::where('type', $type)->first();
    }
}
