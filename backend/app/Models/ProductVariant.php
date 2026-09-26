<?php

namespace App\Models;

use App\Services\SalePricing;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['product_id', 'sku', 'size', 'colour', 'price_override_pence', 'stock_quantity', 'low_stock_threshold', 'is_active'])]
class ProductVariant extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Restocked from nothing: tell everyone waiting on this product (once each).
        static::updated(function (ProductVariant $variant) {
            if ($variant->wasChanged('stock_quantity')
                && (int) $variant->getOriginal('stock_quantity') <= 0
                && $variant->stock_quantity > 0
                && $variant->is_active) {
                $variant->product->notifyBackInStock();
            }
        });
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** The normal, pre-sale price: this variant's override, else the product's. */
    public function basePriceInPence(): int
    {
        return $this->price_override_pence ?? $this->product->price_pence;
    }

    /**
     * Price and any sale behind it, as of now (or $at):
     * ['price' => what's charged, 'original' => the normal price, 'sale' => ?Sale].
     *
     * @return array{price: int, original: int, sale: ?Sale}
     */
    public function quote(?CarbonInterface $at = null): array
    {
        return app(SalePricing::class)->quote($this->product, $this->basePriceInPence(), $at);
    }

    /** What the customer pays for one unit — the sale price while a sale is live. */
    public function priceInPence(): int
    {
        return $this->quote()['price'];
    }

    public function isLowStock(): bool
    {
        return $this->stock_quantity > 0 && $this->stock_quantity <= $this->low_stock_threshold;
    }

    public function isInStock(): bool
    {
        return $this->stock_quantity > 0;
    }
}
