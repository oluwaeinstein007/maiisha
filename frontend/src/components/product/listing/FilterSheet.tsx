"use client";

import { useState } from "react";
import useSWR from "swr";
import { X } from "lucide-react";
import { api, buildQuery } from "@/lib/api";
import { useDialog } from "@/lib/useDialog";
import {
  EMPTY_FILTERS,
  filtersToParams,
  productQueryParams,
  type FilterState,
  type ListingScope,
} from "@/lib/productFilters";
import type { PaginatedResponse, Product, ProductFilterOptions } from "@/lib/types";
import { FilterSections } from "./FilterSections";

const countFetcher = (path: string) =>
  api.get<PaginatedResponse<Product>>(path).then((res) => res.meta.total);

interface FilterSheetProps {
  initial: FilterState;
  options: ProductFilterOptions;
  scope: ListingScope;
  /** Everything currently in the URL (search term, sort…), so the live count matches the real listing. */
  baseQuery: Record<string, string | undefined>;
  onApply: (state: FilterState) => void;
  onClose: () => void;
}

/**
 * Phone/tablet filter panel. Choices are staged in a draft and only applied on
 * "Show N results" — tapping through several options doesn't reload the page
 * behind the sheet each time, and the button says what the result will be.
 * Mounted only while open, so it starts from the current filters every time.
 */
export function FilterSheet({ initial, options, scope, baseQuery, onApply, onClose }: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterState>(initial);
  const { dialogRef, initialFocusRef, onKeyDown } = useDialog(onClose);

  const merged: Record<string, string | undefined> = { ...baseQuery };
  for (const [key, value] of Object.entries(filtersToParams(draft))) merged[key] = value ?? undefined;
  const { data: count } = useSWR(
    `/api/products${buildQuery({ ...productQueryParams(scope, merged), per_page: 1 })}`,
    countFetcher,
    { keepPreviousData: true },
  );

  const resultLabel =
    count === undefined ? "Show results" : count === 0 ? "No matches" : `Show ${count} ${count === 1 ? "result" : "results"}`;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-sheet-title"
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-ink/10 py-1 pl-5 pr-2">
          <h2 id="filter-sheet-title" className="font-display text-lg text-ink">
            Filters
          </h2>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <FilterSections
            idPrefix="sheet"
            options={options}
            state={draft}
            scope={scope}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />
        </div>

        <div className="flex gap-3 border-t border-ink/10 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setDraft(EMPTY_FILTERS)}
            className="min-h-12 rounded-full px-4 text-sm font-medium text-ink underline underline-offset-2"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            disabled={count === 0}
            className="min-h-12 flex-1 rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-ink-soft disabled:bg-ink/40"
          >
            {resultLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
