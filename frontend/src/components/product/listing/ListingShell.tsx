"use client";

import { useCallback, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, SearchX, SlidersHorizontal } from "lucide-react";
import {
  EMPTY_FILTERS,
  SORT_LABELS,
  activeFilterCount,
  filtersToParams,
  parseFilters,
  type FilterState,
  type ListingScope,
} from "@/lib/productFilters";
import type { ProductFilterOptions, ProductSort } from "@/lib/types";
import { ActiveFilterChips, FilterSections } from "./FilterSections";
import { FilterSheet } from "./FilterSheet";

interface ListingShellProps {
  /** Total matching products, from the server render of the current URL. */
  total: number;
  options: ProductFilterOptions | null;
  scope: ListingScope;
  /** The product grid + pagination, rendered on the server. */
  children: ReactNode;
}

/**
 * Filter + sort chrome around a product listing. The URL is the only state:
 * every change is a `router.replace` (so Back leaves the page rather than
 * stepping through each tick of a filter), the server re-renders the grid, and
 * the old results stay on screen, dimmed, until the new ones arrive.
 */
export function ListingShell({ total, options, scope, children }: ListingShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const state = useMemo(() => parseFilters((name) => searchParams.get(name)), [searchParams]);
  const sort = (searchParams.get("sort") ?? "latest") as ProductSort;
  const appliedCount = activeFilterCount(state, scope);

  const navigate = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete("page"); // a new filter set starts from page 1
      const query = next.toString();
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const applyFilters = useCallback(
    (patch: Partial<FilterState>) => navigate(filtersToParams({ ...state, ...patch })),
    [navigate, state],
  );

  const clearAll = useCallback(() => navigate(filtersToParams(EMPTY_FILTERS)), [navigate]);

  const closeSheet = () => {
    setSheetOpen(false);
    triggerRef.current?.focus();
  };

  const countLabel = `${total} ${total === 1 ? "product" : "products"}`;

  const sortOptions: ProductSort[] = ["latest", "price_asc", "price_desc", "best_selling"];
  if ((options?.on_sale_count ?? 0) > 0 || scope.onSaleOnly) sortOptions.push("discount");

  return (
    // The sidebar column only exists when there are options to put in it — if the
    // filter options failed to load, the products still get the full width.
    <div className={clsx(options && "lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-x-10")}>
      {options && (
        <aside
          aria-label="Filters"
          className="hidden lg:sticky lg:top-[calc(var(--header-h,6rem)+1rem)] lg:block lg:max-h-[calc(100dvh-var(--header-h,6rem)-2rem)] lg:overflow-y-auto lg:pr-2"
        >
          <FilterSections idPrefix="side" options={options} state={state} scope={scope} onChange={applyFilters} />
        </aside>
      )}

      <div className="min-w-0">
        <div className="sticky top-[var(--header-h,3.5rem)] z-30 -mx-4 border-b border-ink/10 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
          <div className="flex items-center gap-3">
            {options && (
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-ink/25 px-4 text-sm font-medium text-ink transition-colors hover:border-ink lg:hidden"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filters
                {appliedCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs text-cream">
                    {appliedCount}
                  </span>
                )}
              </button>
            )}

            {/* On desktop the count shares this row; on phones it gets its own line below. */}
            <p className="hidden text-sm text-ink-soft lg:block" aria-live="polite">
              {countLabel}
            </p>

            {/* min-w-0 + w-full: the select shrinks to the space left beside the Filters button instead of overflowing. */}
            <label className="relative ml-auto inline-flex min-w-0 flex-1 items-center sm:flex-none">
              <span className="sr-only">Sort by</span>
              <select
                value={sortOptions.includes(sort) ? sort : "latest"}
                onChange={(e) => navigate({ sort: e.target.value === "latest" ? null : e.target.value })}
                className="h-10 w-full min-w-0 appearance-none truncate rounded-full border border-ink/25 bg-white pl-4 pr-9 text-base text-ink outline-none transition-colors hover:border-ink focus:border-gold sm:w-auto sm:text-sm"
              >
                {sortOptions.map((value) => (
                  <option key={value} value={value}>
                    {SORT_LABELS[value]}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 text-ink-soft"
              />
            </label>
          </div>
        </div>

        <p className="mt-3 text-sm text-ink-soft lg:hidden" aria-live="polite">
          {countLabel}
        </p>

        <ActiveFilterChips
          state={state}
          scope={scope}
          options={options}
          onChange={applyFilters}
          onClear={clearAll}
        />

        <div
          aria-busy={isPending}
          className={clsx("mt-6 transition-opacity duration-200", isPending && "pointer-events-none opacity-50")}
        >
          {total === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-ink/10 px-6 py-16 text-center">
              <SearchX size={28} className="text-ink-soft/40" aria-hidden="true" />
              <p className="font-display text-lg text-ink">No products match</p>
              <p className="max-w-xs text-sm text-ink-soft">
                {appliedCount > 0
                  ? "Try removing a filter or two to see more."
                  : "There's nothing to show here yet — check back soon."}
              </p>
              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-1 min-h-11 rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-ink-soft"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            children
          )}
        </div>
      </div>

      {sheetOpen && options && (
        <FilterSheet
          initial={state}
          options={options}
          scope={scope}
          baseQuery={Object.fromEntries(searchParams.entries())}
          onApply={(next) => {
            applyFilters(next);
            closeSheet();
          }}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
