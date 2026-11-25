<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AbandonedCart extends Model
{
    const STATUS_NEW        = 'new';
    const STATUS_CONTACTED  = 'contacted';
    const STATUS_CONVERTED  = 'converted';
    const STATUS_LOST       = 'lost';

    protected $fillable = ['name', 'phone', 'cart_items', 'total', 'status', 'contacted_at', 'woo_order_id', 'reminded_at'];

    protected $casts = [
        'cart_items'   => 'array',
        'total'        => 'float',
        'contacted_at' => 'datetime',
        'reminded_at'  => 'datetime',
    ];

    // Eager-loadable so the Filament table can fetch every row's addresses
    // in one query (WHERE phone IN (...)) instead of the accessor below
    // firing a fresh query per row — the admin list can run into dozens of
    // rows, and that was a real N+1 query cost on an account already tight
    // on CPU quota.
    public function addresses()
    {
        return $this->hasMany(CustomerAddress::class, 'phone', 'phone');
    }

    // Abandoned carts are recorded the moment items are added — well before
    // checkout, where an address would normally be collected — so there's
    // no real location for this specific cart. For a returning customer,
    // their most recent saved address is shown as an approximate hint only
    // (never as this cart's actual delivery location, which isn't known).
    public function getLastKnownAddressAttribute(): ?string
    {
        // Uses the eager-loaded `addresses` relation when present (see
        // AbandonedCartResource::table()); falls back to a lazy load (one
        // query) when accessed outside that context, e.g. the single-record
        // view page.
        $address = $this->relationLoaded('addresses')
            ? $this->addresses->first()
            : CustomerAddress::where('phone', $this->phone)
                ->orderByDesc('is_default')
                ->orderByDesc('created_at')
                ->first();

        if (!$address) return null;

        return trim(($address->city ? $address->city . ' — ' : '') . $address->address_text);
    }
}
