<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppInstall extends Model
{
    protected $fillable = [
        'device_id',
        'platform',
        'app_version',
        'media_source',
        'campaign',
        'first_seen_at',
        'last_seen_at',
    ];

    protected $casts = [
        'first_seen_at' => 'datetime',
        'last_seen_at'  => 'datetime',
    ];
}
