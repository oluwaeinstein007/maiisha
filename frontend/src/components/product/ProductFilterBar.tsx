"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

const SORT_OPTIONS = [
  { value: "latest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "best_selling", label: "Best selling" },
] as const;

export function ProductFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [colour, setColour] = useState(searchParams.get("colour") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") ?? "");

  const pushParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    router.push(`?${next.toString()}`, { scroll: false });
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    pushParams({
      size: size || null,
      colour: colour || null,
      min_price: minPrice ? String(Math.round(Number(minPrice) * 100)) : null,
      max_price: maxPrice ? String(Math.round(Number(maxPrice) * 100)) : null,
    });
  };

  return (
    <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Size</label>
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. M"
            className="w-24 rounded-md border border-ink/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Colour</label>
          <input
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            placeholder="e.g. Black"
            className="w-28 rounded-md border border-ink/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Min £</label>
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-20 rounded-md border border-ink/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Max £</label>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-20 rounded-md border border-ink/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-cream hover:bg-ink-soft"
        >
          Apply
        </button>
      </form>

      <div>
        <label className="mb-1 block text-xs text-ink-soft">Sort by</label>
        <select
          value={searchParams.get("sort") ?? "latest"}
          onChange={(e) => pushParams({ sort: e.target.value })}
          className="rounded-md border border-ink/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
