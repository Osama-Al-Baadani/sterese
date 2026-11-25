<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ProductVariation extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'price',
        'regular_price',
        'sale_price',
        'stock_status',
        'stock_quantity',
        'image_path',
        'external_image_url',
        'attributes',
        'sort_order',
    ];

    protected $casts = [
        'price'          => 'decimal:2',
        'regular_price'  => 'decimal:2',
        'sale_price'     => 'decimal:2',
        'stock_quantity' => 'integer',
        'attributes'     => 'array',
        'sort_order'     => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $variation) {
            $regular = (float) ($variation->regular_price ?? 0);
            $sale = $variation->sale_price !== null && $variation->sale_price !== '' ? (float) $variation->sale_price : null;

            if ($sale !== null && $sale > 0 && ($regular <= 0 || $sale < $regular)) {
                $variation->price = $sale;
                if ($regular <= 0) {
                    $variation->regular_price = $sale;
                }
            } else {
                $variation->sale_price = null;
                $variation->price = $regular;
            }

            if ($variation->stock_quantity !== null) {
                $variation->stock_status = $variation->stock_quantity > 0 ? 'instock' : 'outofstock';
            }
        });
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        if (!empty($this->image_path)) {
            if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
                return $this->image_path;
            }
            return Storage::disk('public')->url($this->image_path);
        }

        return $this->external_image_url ?: null;
    }

    public function toApiArray(): array
    {
        $attrs = collect($this->attributes ?? [])
            ->filter(fn ($row) => is_array($row) && (!empty($row['attribute']) || !empty($row['value'])))
            ->map(fn ($row) => [
                'attribute' => (string) ($row['attribute'] ?? ''),
                'value'     => (string) ($row['value'] ?? ''),
            ])
            ->values()
            ->all();

        return [
            'id'             => $this->id,
            'sku'            => $this->sku,
            'price'          => (string) $this->price,
            'regular_price'  => (string) $this->regular_price,
            'sale_price'     => $this->sale_price !== null ? (string) $this->sale_price : null,
            'stock_status'   => $this->stock_status ?: 'instock',
            'stock_quantity' => $this->stock_quantity,
            'image'          => $this->image_url,
            'attributes'     => $attrs,
        ];
    }
}
