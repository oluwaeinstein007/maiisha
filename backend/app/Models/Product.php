<?php

namespace App\Models;

use App\Mail\BackInStockMail;
use App\Services\SalePricing;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Facades\Mail;

#[Fillable(['category_id', 'brand_id', 'name', 'slug', 'description', 'price_pence', 'is_active', 'is_featured', 'hide_when_out_of_stock'])]
class Product extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'hide_when_out_of_stock' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function variants(): HasMany
    {
        // chaperone(): a variant's price needs its product (ProductVariant::basePriceInPence);
        // this hands the parent over instead of running a query per variant in a list.
        return $this->hasMany(ProductVariant::class)->chaperone();
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function orderItems(): HasManyThrough
    {
        return $this->hasManyThrough(OrderItem::class, ProductVariant::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function wishlistItems(): HasMany
    {
        return $this->hasMany(WishlistItem::class);
    }

    public function stockAlerts(): HasMany
    {
        return $this->hasMany(StockAlert::class);
    }

    public function notifyBackInStock(): void
    {
        $this->stockAlerts()->whereNull('notified_at')->each(function (StockAlert $alert) {
            Mail::to($alert->email)->send(new BackInStockMail($this));
            $alert->update(['notified_at' => now()]);
        });
    }

    public function scopeActive(Builder $query): void
    {
        // PRD FR-23: an admin can opt to hide out-of-stock products from browsing
        // entirely instead of showing them marked "out of stock".
        $query->where('is_active', true)->where(function (Builder $q) {
            $q->where('hide_when_out_of_stock', false)
                ->orWhereHas('variants', fn (Builder $v) => $v->where('is_active', true)->where('stock_quantity', '>', 0));
        });
    }

    /**
     * The photo to show for a given variant colour (FR-3): a colour match if
     * one's been uploaded, otherwise the product's first photo — covers
     * products shot in only one colour, and images uploaded before colour
     * tagging existed. Case-insensitive to match ProductController's colour
     * filter, since admin-entered image colours and seeded/entered variant
     * colours aren't guaranteed to agree on casing ("black" vs "Black").
     */
    public function imageFor(?string $colour): ?ProductImage
    {
        if ($colour !== null) {
            $match = $this->images->first(
                fn (ProductImage $image) => $image->colour !== null && strcasecmp($image->colour, $colour) === 0
            );

            if ($match) {
                return $match;
            }
        }

        return $this->images->first();
    }

    /**
     * The price a shopper is shown for the product ("from £x"): its cheapest
     * variant once any live sale is applied. A product with no variants yet
     * falls back to its own price.
     *
     * @return array{price: int, original: int, sale: ?Sale}
     */
    public function cheapestQuote(): array
    {
        if ($this->relationLoaded('variants') && $this->variants->isNotEmpty()) {
            return $this->variants->map(fn (ProductVariant $v) => $v->quote())->sortBy('price')->first();
        }

        return app(SalePricing::class)->quote($this, $this->price_pence);
    }

    public function totalStock(): int
    {
        return $this->variants->where('is_active', true)->sum('stock_quantity');
    }

    public function inStock(): bool
    {
        return $this->totalStock() > 0;
    }
}
