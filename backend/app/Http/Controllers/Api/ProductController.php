<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\SalePricing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /** Garment sizes in their natural order; anything else (UK 5, 30ml, 24") sorts naturally after them. */
    private const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', 'one size'];

    public function index(Request $request)
    {
        $query = $this->catalogue($request)->with(['category', 'brand', 'images', 'variants'])->withAvg('reviews', 'rating')->withCount('reviews');

        $this->applyFilters($query, $request);
        $this->applySort($query, $request->string('sort')->toString());

        $products = $query->paginate(min(max($request->integer('per_page', 24), 1), 100));

        return ProductResource::collection($products);
    }

    /**
     * What a shopper can narrow the current listing by (FR-2): the sizes and
     * colours actually in use, the price range on offer, and the categories with
     * product counts. Scoped to the same category/search as the listing, so every
     * option offered is pickable.
     */
    public function filters(Request $request)
    {
        $scope = $this->catalogue($request);
        $effectivePrice = app(SalePricing::class)->effectivePriceSql();

        // The sale page lists on-sale products only, so it must only be offered
        // the sizes/colours/prices that exist among them.
        if ($request->boolean('on_sale')) {
            $scope->whereRaw("{$effectivePrice} < products.price_pence");
        }

        $variants = ProductVariant::query()
            ->whereIn('product_id', (clone $scope)->select('products.id'))
            ->where('is_active', true)
            ->get(['size', 'colour']);

        $range = (clone $scope)->toBase()
            ->selectRaw("MIN({$effectivePrice}) as low, MAX({$effectivePrice}) as high")
            ->first();

        return response()->json([
            'sizes' => $this->sortSizes($this->distinct($variants->pluck('size'))),
            'colours' => $this->distinct($variants->pluck('colour'), sort: true),
            'price' => [
                'min_pence' => $range?->low !== null ? (int) $range->low : null,
                'max_pence' => $range?->high !== null ? (int) $range->high : null,
            ],
            'on_sale_count' => (clone $scope)->whereRaw("{$effectivePrice} < products.price_pence")->count(),
            // Each facet is counted without its own filter, so choosing one doesn't
            // make the list disappear — the shopper can still switch.
            'categories' => $this->categoryFacet($this->catalogue($request, skip: ['category'])),
            'brands' => $this->brandFacet($this->catalogue($request, skip: ['brand'])),
        ]);
    }

    public function show(string $slug)
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->with(['category', 'brand', 'images', 'variants'])
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->firstOrFail();

        return new ProductResource($product);
    }

    /**
     * "You may also like": other browsable products ranked by how alike they are —
     * same category and brand first, then nearby price, topped up from the parent
     * category so a sparse category still gets a full row.
     */
    public function related(Request $request, string $slug)
    {
        $product = Product::query()->active()->where('slug', $slug)->firstOrFail();
        $limit = min(max($request->integer('limit', 8), 1), 24);

        $category = Category::find($product->category_id);
        $scopeIds = Category::idsWithDescendants([$category?->parent_id ?? $product->category_id]);

        $candidates = Product::query()
            ->active()
            ->where('products.id', '!=', $product->id)
            ->whereIn('products.category_id', array_unique([...$scopeIds, $product->category_id]))
            ->with(['category', 'brand', 'images', 'variants'])
            ->withSum('orderItems as units_sold', 'quantity')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->limit(200)
            ->get();

        $related = $candidates
            ->sortByDesc(fn (Product $candidate) => [
                ($candidate->category_id === $product->category_id ? 4 : 0)
                    + ($product->brand_id && $candidate->brand_id === $product->brand_id ? 2 : 0)
                    + (abs($candidate->price_pence - $product->price_pence) <= $product->price_pence * 0.3 ? 1 : 0),
                (int) $candidate->units_sold,
                $candidate->id,
            ])
            ->take($limit)
            ->values();

        return ProductResource::collection($related);
    }

    /**
     * What's browsable at all, narrowed only by where the shopper is: a category,
     * a brand and/or a search term. `$skip` leaves one out — used to count a
     * facet without its own filter.
     *
     * @param  list<string>  $skip
     */
    private function catalogue(Request $request, array $skip = []): Builder
    {
        $query = Product::query()->active();

        if (! in_array('brand', $skip, true) && $request->filled('brand')) {
            $slugs = $this->listParam($request, 'brand');

            // Only live brands: a switched-off brand's page and filter don't exist.
            $query->whereIn('products.brand_id', $slugs === [] ? [] : Brand::query()
                ->where('is_active', true)
                ->whereRaw('LOWER(slug) IN ('.$this->placeholders($slugs).')', $slugs)
                ->pluck('id'));
        }

        if (! in_array('category', $skip, true) && $request->filled('category')) {
            $category = Category::where('slug', $request->string('category'))->first();

            // Browsing "Women's fashion" includes everything in Dresses, Tops… beneath it.
            $query->whereIn('products.category_id', $category ? Category::idsWithDescendants([$category->id]) : []);
        }

        // Exact lookup by slug, e.g. the shopper's recently viewed list.
        if ($request->filled('slugs')) {
            $query->whereIn('products.slug', array_slice($this->listParam($request, 'slugs'), 0, 24));
        }

        if ($request->filled('search')) {
            // LOWER() on both sides: a bare LIKE is case-insensitive on SQLite but not
            // on Postgres, where "dress" would miss "Pleated Maxi Dress". The escape
            // character is "!", not a backslash: PDO's pgsql driver reads a backslash in a
            // quoted string as an escape, so ESCAPE '\' loses track of the placeholders after it.
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($request->string('search'))).'%';

            $query->where(fn (Builder $q) => $q
                ->whereRaw("LOWER(products.name) LIKE ? ESCAPE '!'", [$term])
                ->orWhereRaw("LOWER(products.description) LIKE ? ESCAPE '!'", [$term]));
        }

        return $query;
    }

    private function applyFilters(Builder $query, Request $request): void
    {
        $sizes = $this->listParam($request, 'size');
        $colours = $this->listParam($request, 'colour');
        $inStock = $request->boolean('in_stock');

        if ($sizes || $colours || $inStock) {
            // One variant has to satisfy every condition together: "size S in Gold"
            // must not match a product that merely has an S in black and a Gold in M.
            $query->whereHas('variants', function (Builder $variants) use ($sizes, $colours, $inStock) {
                $variants->where('product_variants.is_active', true);

                if ($sizes) {
                    $variants->whereRaw('LOWER(product_variants.size) IN ('.$this->placeholders($sizes).')', $sizes);
                }

                if ($colours) {
                    $variants->whereRaw('LOWER(product_variants.colour) IN ('.$this->placeholders($colours).')', $colours);
                }

                if ($inStock) {
                    $variants->where('product_variants.stock_quantity', '>', 0);
                }
            });
        }

        // Price filters act on what the shopper pays — the sale price while a sale
        // is live — so "under £50" doesn't hide a £60 dress that's currently £45.
        $effectivePrice = app(SalePricing::class)->effectivePriceSql();

        if ($request->filled('min_price')) {
            $query->whereRaw("{$effectivePrice} >= ?", [(int) $request->input('min_price')]);
        }

        if ($request->filled('max_price')) {
            $query->whereRaw("{$effectivePrice} <= ?", [(int) $request->input('max_price')]);
        }

        if ($request->boolean('on_sale')) {
            $query->whereRaw("{$effectivePrice} < products.price_pence");
        }
    }

    private function applySort(Builder $query, string $sort): void
    {
        $effectivePrice = app(SalePricing::class)->effectivePriceSql();

        match ($sort) {
            'price_asc' => $query->orderByRaw("{$effectivePrice} ASC")->orderBy('products.id'),
            'price_desc' => $query->orderByRaw("{$effectivePrice} DESC")->orderBy('products.id'),
            'discount' => $query->orderByRaw("(products.price_pence - {$effectivePrice}) DESC")->orderByDesc('products.id'),
            'best_selling' => $query->withSum('orderItems as units_sold', 'quantity')->orderByDesc('units_sold')->orderByDesc('products.id'),
            // id as a tie-breaker: products seeded/imported in one go share a created_at,
            // and an unstable order would shuffle items between pages.
            default => $query->orderByDesc('products.created_at')->orderByDesc('products.id'),
        };
    }

    /**
     * "size=S,M" or "size[]=S&size[]=M" → ['s', 'm'] (lower-cased: matching is case-insensitive).
     *
     * @return list<string>
     */
    private function listParam(Request $request, string $key): array
    {
        $raw = $request->input($key);
        $values = is_array($raw) ? $raw : explode(',', (string) $raw);

        return collect($values)
            ->map(fn ($value) => mb_strtolower(trim((string) $value)))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /** @param  list<string>  $values */
    private function placeholders(array $values): string
    {
        return implode(', ', array_fill(0, count($values), '?'));
    }

    /**
     * Distinct non-empty values, case-insensitively ("Black" and "black" are one option).
     *
     * @return list<string>
     */
    private function distinct($values, bool $sort = false): array
    {
        $unique = $values->filter()->unique(fn ($value) => mb_strtolower($value))->values();

        return ($sort ? $unique->sort(SORT_NATURAL | SORT_FLAG_CASE) : $unique)->values()->all();
    }

    /**
     * @param  list<string>  $sizes
     * @return list<string>
     */
    private function sortSizes(array $sizes): array
    {
        $rank = array_flip(self::SIZE_ORDER);

        usort($sizes, function (string $a, string $b) use ($rank) {
            $rankA = $rank[mb_strtolower($a)] ?? null;
            $rankB = $rank[mb_strtolower($b)] ?? null;

            return match (true) {
                $rankA !== null && $rankB !== null => $rankA <=> $rankB,
                $rankA !== null => -1,
                $rankB !== null => 1,
                default => strnatcasecmp($a, $b),
            };
        });

        return $sizes;
    }

    /**
     * Live brands with how many browsable products each has in the current listing.
     *
     * @return list<array{slug: string, name: string, count: int}>
     */
    private function brandFacet(Builder $scope): array
    {
        $counts = (clone $scope)->toBase()
            ->whereNotNull('products.brand_id')
            ->groupBy('products.brand_id')
            ->selectRaw('products.brand_id, COUNT(*) as total')
            ->pluck('total', 'brand_id');

        return Brand::query()
            ->where('is_active', true)
            ->whereIn('id', $counts->keys())
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug'])
            ->map(fn (Brand $brand) => [
                'slug' => $brand->slug,
                'name' => $brand->name,
                'count' => (int) $counts[$brand->id],
            ])
            ->values()
            ->all();
    }

    /**
     * Top-level categories with how many browsable products sit in each (subcategories rolled up).
     *
     * @return list<array{slug: string, name: string, count: int}>
     */
    private function categoryFacet(Builder $scope): array
    {
        $counts = (clone $scope)->toBase()
            ->groupBy('products.category_id')
            ->selectRaw('products.category_id, COUNT(*) as total')
            ->pluck('total', 'category_id');

        $categories = Category::query()->orderBy('sort_order')->get(['id', 'parent_id', 'name', 'slug']);
        $parents = $categories->pluck('parent_id', 'id')->all();

        return $categories->whereNull('parent_id')
            ->map(fn (Category $category) => [
                'slug' => $category->slug,
                'name' => $category->name,
                'count' => (int) collect(Category::idsWithDescendants([$category->id], $parents))
                    ->sum(fn (int $id) => $counts[$id] ?? 0),
            ])
            ->filter(fn (array $facet) => $facet['count'] > 0)
            ->values()
            ->all();
    }
}
