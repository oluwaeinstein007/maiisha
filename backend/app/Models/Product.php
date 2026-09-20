<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[Fillable(['category_id', 'name', 'slug', 'description', 'price_pence', 'is_active', 'is_featured', 'hide_when_out_of_stock'])]
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

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function orderItems(): HasManyThrough
    {
        return $this->hasManyThrough(OrderItem::class, ProductVariant::class);
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

    public function totalStock(): int
    {
        return $this->variants->where('is_active', true)->sum('stock_quantity');
    }

    public function inStock(): bool
    {
        return $this->totalStock() > 0;
    }
}
