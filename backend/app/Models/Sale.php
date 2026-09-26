<?php

namespace App\Models;

use App\Services\SalePricing;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A seasonal or recurring sale — Christmas, Ileya, "Monday deals". Unlike a
 * DiscountCode nothing has to be typed in: while a sale is live, every product
 * it covers is simply cheaper, everywhere (listing, product page, cart, checkout).
 */
#[Fillable(['name', 'description', 'type', 'value', 'applies_to', 'starts_at', 'ends_at', 'active_weekdays', 'is_active'])]
class Sale extends Model
{
    use HasFactory;

    public const TYPE_PERCENTAGE = 'percentage';

    public const TYPE_FIXED = 'fixed';

    public const APPLIES_TO_ALL = 'all';

    /** Whatever the admin picked: any mix of lines (categories), brands and individual products. */
    public const APPLIES_TO_SELECTED = 'selected';

    public const STATUS_LIVE = 'live';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_ENDED = 'ended';

    public const STATUS_INACTIVE = 'inactive';

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'active_weekdays' => 'array',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // SalePricing keeps the sale definitions it loaded for the rest of the
        // request; drop that copy whenever one changes so an edit is priced
        // immediately (and a test that edits a sale between two requests sees it).
        static::saved(fn () => app(SalePricing::class)->flush());
        static::deleted(fn () => app(SalePricing::class)->flush());
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'sale_category');
    }

    public function brands(): BelongsToMany
    {
        return $this->belongsToMany(Brand::class, 'sale_brand');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'sale_product');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Whether the sale is in force at $at: switched on, inside its date window,
     * and — for a recurring "Monday deal" — on one of its weekdays. Weekdays are
     * read in the shop's timezone, not UTC, so a Monday deal flips at UK midnight.
     */
    public function isLiveAt(CarbonInterface $at): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->starts_at && $at->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at && $at->gt($this->ends_at)) {
            return false;
        }

        if (! empty($this->active_weekdays)) {
            $weekday = $at->copy()->setTimezone(config('commerce.timezone'))->isoWeekday();

            if (! in_array($weekday, $this->active_weekdays, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * "scheduled" covers both a sale whose window hasn't opened yet and a
     * recurring one that is between its weekdays (e.g. a Monday deal on a Tuesday).
     */
    public function status(?CarbonInterface $at = null): string
    {
        $at ??= now();

        if (! $this->is_active) {
            return self::STATUS_INACTIVE;
        }

        if ($this->ends_at && $at->gt($this->ends_at)) {
            return self::STATUS_ENDED;
        }

        return $this->isLiveAt($at) ? self::STATUS_LIVE : self::STATUS_SCHEDULED;
    }

    /** The price of an item that normally costs $basePence, with this sale applied. */
    public function priceFor(int $basePence): int
    {
        if ($this->type === self::TYPE_PERCENTAGE) {
            // Integer maths, rounding the discount half-up — identical to the SQL
            // in SalePricing::effectivePriceSql(), so a price you can sort/filter
            // by is exactly the price the customer is charged.
            return $basePence - intdiv($basePence * $this->value + 50, 100);
        }

        return max(0, $basePence - $this->value);
    }

    /** Short badge/banner text: "20% off" or "£5 off". */
    public function discountLabel(): string
    {
        if ($this->type === self::TYPE_PERCENTAGE) {
            return "{$this->value}% off";
        }

        $pounds = $this->value % 100 === 0
            ? (string) intdiv($this->value, 100)
            : number_format($this->value / 100, 2);

        return "£{$pounds} off";
    }
}
