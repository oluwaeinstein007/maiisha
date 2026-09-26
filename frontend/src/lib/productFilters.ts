import type { ProductSort } from "./types";

/**
 * The URL is the single source of truth for a listing's filters: everything
 * here is pure, converting between a query string and a typed FilterState, so
 * the server page (which fetches) and the client filter UI (which edits) can
 * never disagree about what's applied.
 *
 * Params: size / colour are comma-separated lists; min_price / max_price are
 * in pence; in_stock / on_sale are "1"; category applies on the all-products
 * and search pages (a category page already is one).
 */
export interface FilterState {
  sizes: string[];
  colours: string[];
  brands: string[];
  minPence: number | null;
  maxPence: number | null;
  inStock: boolean;
  onSale: boolean;
  category: string | null;
}

export const EMPTY_FILTERS: FilterState = {
  sizes: [],
  colours: [],
  brands: [],
  minPence: null,
  maxPence: null,
  inStock: false,
  onSale: false,
  category: null,
};

/** Where a listing sits, fixed by the page (not by the shopper's filter choices). */
export interface ListingScope {
  /** Category page: the category's slug. */
  category?: string;
  /** Brand page: the brand's slug. */
  brand?: string;
  /** Search page: the search term. */
  search?: string;
  /** The sale page lists on-sale products only. */
  onSaleOnly?: boolean;
}

export const SORT_LABELS: Record<ProductSort, string> = {
  latest: "Newest",
  price_asc: "Price: low–high",
  price_desc: "Price: high–low",
  best_selling: "Best selling",
  discount: "Biggest saving",
};

type ParamReader = (name: string) => string | null | undefined;

function list(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function pence(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function parseFilters(read: ParamReader): FilterState {
  return {
    sizes: list(read("size")),
    colours: list(read("colour")),
    brands: list(read("brand")),
    minPence: pence(read("min_price")),
    maxPence: pence(read("max_price")),
    inStock: read("in_stock") === "1",
    onSale: read("on_sale") === "1",
    category: read("category") || null,
  };
}

/** URL param patch for a state: every filter key is present, null meaning "remove it". */
export function filtersToParams(state: FilterState): Record<string, string | null> {
  return {
    size: state.sizes.length ? state.sizes.join(",") : null,
    colour: state.colours.length ? state.colours.join(",") : null,
    brand: state.brands.length ? state.brands.join(",") : null,
    min_price: state.minPence !== null ? String(state.minPence) : null,
    max_price: state.maxPence !== null ? String(state.maxPence) : null,
    in_stock: state.inStock ? "1" : null,
    on_sale: state.onSale ? "1" : null,
    category: state.category,
  };
}

/** How many separate filters are applied (a price range counts once). */
export function activeFilterCount(state: FilterState, scope: ListingScope): number {
  return (
    state.sizes.length +
    state.colours.length +
    (scope.brand ? 0 : state.brands.length) +
    (state.minPence !== null || state.maxPence !== null ? 1 : 0) +
    (state.inStock ? 1 : 0) +
    (state.onSale && !scope.onSaleOnly ? 1 : 0) +
    (state.category && !scope.category ? 1 : 0)
  );
}

/**
 * The /api/products query for a listing: the page's fixed scope plus whatever
 * filters/sort are in the URL. `query` is a plain record (server) — the client
 * passes Object.fromEntries(searchParams).
 */
export function productQueryParams(
  scope: ListingScope,
  query: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return {
    category: scope.category ?? query.category,
    brand: scope.brand ?? query.brand,
    search: scope.search ?? query.q,
    size: query.size,
    colour: query.colour,
    min_price: query.min_price,
    max_price: query.max_price,
    in_stock: query.in_stock,
    on_sale: scope.onSaleOnly ? "1" : query.on_sale,
    sort: query.sort,
  };
}

const PRICE_STEPS_POUNDS = [10, 25, 50, 75, 100, 150, 200, 300, 500];

export interface PricePreset {
  label: string;
  min: number | null;
  max: number | null;
}

/**
 * One-tap price bands drawn from what's actually on offer: "Under £10", "£10–£50", …
 * Upper bounds are exclusive (a £50 item sits in "£50–£100"), so bands never overlap.
 */
export function pricePresets(minPence: number | null, maxPence: number | null): PricePreset[] {
  if (minPence === null || maxPence === null || maxPence - minPence < 500) return [];

  const inside = PRICE_STEPS_POUNDS.map((pounds) => pounds * 100).filter(
    (bound) => bound > minPence && bound < maxPence,
  );
  if (inside.length === 0) return [];

  // At most three cut-points (four bands) so the row stays a single tidy wrap.
  const bounds =
    inside.length <= 3 ? inside : [inside[0], inside[Math.floor(inside.length / 2)], inside[inside.length - 1]];
  const pounds = (p: number) => `£${p / 100}`;

  return [
    { label: `Under ${pounds(bounds[0])}`, min: null, max: bounds[0] - 1 },
    ...bounds.slice(0, -1).map((bound, i) => ({
      label: `${pounds(bound)}–${pounds(bounds[i + 1])}`,
      min: bound,
      max: bounds[i + 1] - 1,
    })),
    { label: `${pounds(bounds[bounds.length - 1])}+`, min: bounds[bounds.length - 1], max: null },
  ];
}

/** Human label for the applied price range, for a removable chip. */
export function priceRangeLabel(minPence: number | null, maxPence: number | null): string {
  const pounds = (p: number) => `£${p % 100 === 0 ? p / 100 : (p / 100).toFixed(2)}`;
  if (minPence !== null && maxPence !== null) return `${pounds(minPence)}–${pounds(maxPence)}`;
  if (maxPence !== null) return `Under ${pounds(maxPence + 1)}`;
  return `${pounds(minPence ?? 0)}+`;
}

/** "12.50" for the price inputs (which are in pounds, the URL in pence). */
export function penceToPoundsInput(pence: number | null): string {
  if (pence === null) return "";
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

export function poundsInputToPence(value: string): number | null {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
