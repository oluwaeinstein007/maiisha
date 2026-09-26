<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The single place a selling price is worked out. Everything customer-facing —
 * product listings, the product page, the cart, checkout and the order lines —
 * asks this, so they can never disagree about what something costs.
 *
 * If several sales are live and cover the same product, the one giving the
 * lowest price wins; sales never stack with each other. (A DiscountCode still
 * applies on top of the sale price at checkout — that's a separate mechanism.)
 */
class SalePricing
{
    private const RELOAD_AFTER_SECONDS = 60;

    /** @var Collection<int, Sale>|null */
    private ?Collection $sales = null;

    private float $loadedAt = 0;

    /** @var array<int, list<int>> sale id => category ids the sale covers, subcategories included */
    private array $categoryScope = [];

    /** @var array<int, list<int>> sale id => brand ids the sale covers */
    private array $brandScope = [];

    /** @var array<int, list<int>> sale id => individual product ids the sale covers */
    private array $productScope = [];

    /** @var array{ts: int, sales: Collection<int, Sale>}|null */
    private ?array $liveCache = null;

    public function flush(): void
    {
        $this->sales = null;
        $this->liveCache = null;
    }

    /**
     * Every switched-on sale, whatever its dates. Loaded once and reused: a
     * product list prices dozens of variants and mustn't run a query for each.
     * Time-based liveness is decided per call, so only edits (see Sale::booted)
     * — or the short TTL, for long-lived workers — ever make this stale.
     *
     * @return Collection<int, Sale>
     */
    private function activeSales(): Collection
    {
        if ($this->sales !== null && microtime(true) - $this->loadedAt < self::RELOAD_AFTER_SECONDS) {
            return $this->sales;
        }

        $this->sales = Sale::query()
            ->where('is_active', true)
            ->with(['categories:id', 'brands:id', 'products:id'])
            ->orderBy('id')
            ->get();
        $this->loadedAt = microtime(true);
        $this->liveCache = null;

        $parents = $this->sales->contains(fn (Sale $s) => $s->categories->isNotEmpty())
            ? Category::query()->pluck('parent_id', 'id')->all()
            : [];

        $this->categoryScope = $this->brandScope = $this->productScope = [];
        foreach ($this->sales as $sale) {
            $this->categoryScope[$sale->id] = Category::idsWithDescendants($sale->categories->pluck('id')->all(), $parents);
            $this->brandScope[$sale->id] = $sale->brands->pluck('id')->map(fn ($id) => (int) $id)->all();
            $this->productScope[$sale->id] = $sale->products->pluck('id')->map(fn ($id) => (int) $id)->all();
        }

        return $this->sales;
    }

    /**
     * Sales in force at $at (default: now).
     *
     * @return Collection<int, Sale>
     */
    public function liveSales(?CarbonInterface $at = null): Collection
    {
        $at ??= now();
        $sales = $this->activeSales();

        if ($this->liveCache !== null && $this->liveCache['ts'] === $at->getTimestamp()) {
            return $this->liveCache['sales'];
        }

        $live = $sales->filter(fn (Sale $sale) => $sale->isLiveAt($at))->values();
        $this->liveCache = ['ts' => $at->getTimestamp(), 'sales' => $live];

        return $live;
    }

    /**
     * A whole-shop sale covers everything; otherwise a product is covered when
     * it's one of the chosen products, or sits in a chosen line (category — or
     * one beneath it), or belongs to a chosen brand.
     */
    public function covers(Sale $sale, Product $product): bool
    {
        if ($sale->applies_to === Sale::APPLIES_TO_ALL) {
            return true;
        }

        return in_array($product->id, $this->productScope[$sale->id] ?? [], true)
            || in_array($product->category_id, $this->categoryScope[$sale->id] ?? [], true)
            || ($product->brand_id !== null && in_array($product->brand_id, $this->brandScope[$sale->id] ?? [], true));
    }

    /**
     * What $product costs right now (or at $at), given its normal price of
     * $basePence — and which sale, if any, is responsible for the difference.
     *
     * @return array{price: int, original: int, sale: ?Sale}
     */
    public function quote(Product $product, int $basePence, ?CarbonInterface $at = null): array
    {
        $best = null;
        $bestPrice = $basePence;

        foreach ($this->liveSales($at) as $sale) {
            if (! $this->covers($sale, $product)) {
                continue;
            }

            $price = $sale->priceFor($basePence);

            if ($price < $bestPrice) {
                $bestPrice = $price;
                $best = $sale;
            }
        }

        return ['price' => $bestPrice, 'original' => $basePence, 'sale' => $best];
    }

    public function priceFor(Product $product, int $basePence, ?CarbonInterface $at = null): int
    {
        return $this->quote($product, $basePence, $at)['price'];
    }

    /**
     * The same calculation as quote(), as a SQL expression over the products
     * table — so the storefront can filter and sort by the price a customer
     * will actually pay, not the pre-sale price. Only whole numbers taken from
     * our own database are interpolated, never request input.
     *
     * Deliberately mirrors Sale::priceFor(): integer maths, half-up rounding.
     */
    public function effectivePriceSql(
        string $price = 'products.price_pence',
        string $categoryId = 'products.category_id',
        string $productId = 'products.id',
        string $brandId = 'products.brand_id',
    ): string {
        $candidates = [];

        foreach ($this->liveSales() as $sale) {
            $value = (int) $sale->value;

            $reduced = $sale->type === Sale::TYPE_PERCENTAGE
                ? "({$price} - (({$price} * {$value} + 50) / 100))"
                : "(CASE WHEN {$price} > {$value} THEN {$price} - {$value} ELSE 0 END)";

            $condition = $sale->applies_to === Sale::APPLIES_TO_ALL
                ? null
                : $this->anyOf([
                    $this->inList($categoryId, $this->categoryScope[$sale->id] ?? []),
                    $this->inList($brandId, $this->brandScope[$sale->id] ?? []),
                    $this->inList($productId, $this->productScope[$sale->id] ?? []),
                ]);

            if ($condition === '') {
                continue; // covers nothing (e.g. every line it named was deleted)
            }

            $candidates[] = $condition === null
                ? $reduced
                : "(CASE WHEN {$condition} THEN {$reduced} ELSE {$price} END)";
        }

        if ($candidates === []) {
            return $price;
        }

        if (count($candidates) === 1) {
            return $candidates[0];
        }

        // SQLite (the test database) spells scalar "smallest of" MIN(); Postgres LEAST().
        $smallest = DB::connection()->getDriverName() === 'sqlite' ? 'MIN' : 'LEAST';

        return $smallest.'('.implode(', ', $candidates).')';
    }

    /**
     * "(a OR b OR c)" over the non-empty parts; '' when there are none.
     *
     * @param  list<string>  $conditions
     */
    private function anyOf(array $conditions): string
    {
        $conditions = array_values(array_filter($conditions, fn (string $c) => $c !== ''));

        return $conditions === [] ? '' : '('.implode(' OR ', $conditions).')';
    }

    /** @param  list<int|string>  $ids */
    private function inList(string $column, array $ids): string
    {
        if ($ids === []) {
            return '';
        }

        return "{$column} IN (".implode(', ', array_map('intval', $ids)).')';
    }
}
