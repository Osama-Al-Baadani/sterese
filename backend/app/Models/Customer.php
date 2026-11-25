<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Hash;

class Customer extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'phone',
        'email',
        'password',
        'wallet_balance',
        'woo_customer_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'wallet_balance' => 'decimal:2',
        'is_active'      => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $customer) {
            $customer->phone = static::normalizePhone($customer->phone);

            if (!empty($customer->password) && !str_starts_with($customer->password, '$2y$') && !str_starts_with($customer->password, '$argon2')) {
                $customer->password = Hash::make($customer->password);
            }
        });
    }

    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        $digits = preg_replace('/^(00966|966)/', '0', $digits);
        if ($digits !== '' && !str_starts_with($digits, '0')) {
            $digits = '0' . $digits;
        }

        return $digits;
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class, 'phone', 'phone');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'customer_phone', 'phone');
    }

    public function toApiArray(?string $authToken = null, ?bool $isNew = null): array
    {
        $fullName = trim($this->first_name . ' ' . $this->last_name);

        $data = [
            'id'             => $this->id,
            'first_name'     => $this->first_name ?? '',
            'last_name'      => $this->last_name ?? '',
            'name'           => $fullName,
            'username'       => $this->phone,
            'email'          => $this->email ?: "{$this->phone}@customers.storeseco.com",
            'wallet_balance' => (float) $this->wallet_balance,
            'billing'        => [
                'first_name' => $this->first_name ?? '',
                'last_name'  => $this->last_name ?? '',
                'phone'      => $this->phone,
                'email'      => $this->email ?: "{$this->phone}@customers.storeseco.com",
            ],
        ];

        if ($authToken !== null) {
            $data['auth_token'] = $authToken;
        }
        if ($isNew !== null) {
            $data['is_new'] = $isNew;
        }

        return $data;
    }
}
