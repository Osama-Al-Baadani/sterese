<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CustomerAuthToken extends Model
{
    protected $fillable = ['token', 'customer_id', 'phone', 'last_used_at'];

    protected $casts = [
        'last_used_at' => 'datetime',
    ];

    public static function issue(int $customerId, ?string $phone): string
    {
        $token = Str::random(64);
        static::create([
            'token'       => $token,
            'customer_id' => $customerId,
            'phone'       => $phone,
            'last_used_at' => now(),
        ]);
        return $token;
    }

    /** Returns the customer_id for a valid bearer token, or null. */
    public static function resolve(?string $token): ?int
    {
        if (!$token) return null;
        $row = static::where('token', $token)->first();
        if (!$row) return null;
        $row->update(['last_used_at' => now()]);
        return (int) $row->customer_id;
    }
}
