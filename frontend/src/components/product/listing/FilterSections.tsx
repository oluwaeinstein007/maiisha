"use client";

import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { colourSwatch } from "@/lib/colours";
import { sanitizeNumeric } from "@/lib/number";
import {
  penceToPoundsInput,
  poundsInputToPence,
  priceRangeLabel,
  pricePresets,
  type FilterState,
  type ListingScope,
} from "@/lib/productFilters";
import type { ProductFilterOptions } from "@/lib/types";

const PILL =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const PILL_OFF = "border-ink/20 text-ink hover:border-ink";
const PILL_ON = "border-ink bg-ink text-cream";

/** Past this many options a group collapses behind "Show all". */
const COLLAPSED_LIMIT = 10;

interface FilterSectionsProps {
  options: ProductFilterOptions;
  state: FilterState;
  scope: ListingScope;
  onChange: (patch: Partial<FilterState>) => void;
  /** Keeps element ids unique when the sections are mounted twice (sidebar + sheet). */
  idPrefix: string;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();

  return (
    <div role="group" aria-labelledby={headingId} className="border-b border-ink/10 py-5 first:pt-0 last:border-b-0">
      <h3 id={headingId} className="mb-3 text-sm font-semibold text-ink">
        {title}
      </h3>
      {children}
    </div>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterSections({ options, state, scope, onChange, idPrefix }: FilterSectionsProps) {
  const showCategories = !scope.category && options.categories.length > 0;
  const showBrands = !scope.brand && options.brands.length > 0;
  const showOnSale = !scope.onSaleOnly && (options.on_sale_count > 0 || state.onSale);
  const hasPrice = options.price.min_pence !== null && options.price.max_pence !== null &&
    options.price.max_pence > options.price.min_pence;

  return (
    <div>
      {showCategories && (
        <Section title="Category">
          <div className="-mx-2 flex flex-col">
            <CategoryOption
              label="All categories"
              selected={state.category === null}
              onSelect={() => onChange({ category: null })}
            />
            {options.categories.map((category) => (
              <CategoryOption
                key={category.slug}
                label={category.name}
                count={category.count}
                selected={state.category === category.slug}
                onSelect={() => onChange({ category: category.slug })}
              />
            ))}
          </div>
        </Section>
      )}

      {showBrands && (
        <Section title="Brand">
          <div className="flex flex-col">
            {options.brands.map((brand) => (
              <CheckRow
                key={brand.slug}
                id={`${idPrefix}-brand-${brand.slug}`}
                label={brand.name}
                count={brand.count}
                checked={state.brands.includes(brand.slug)}
                onChange={() => onChange({ brands: toggle(state.brands, brand.slug) })}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Availability">
        <div className="flex flex-col">
          <CheckRow
            id={`${idPrefix}-in-stock`}
            label="In stock only"
            checked={state.inStock}
            onChange={(checked) => onChange({ inStock: checked })}
          />
          {showOnSale && (
            <CheckRow
              id={`${idPrefix}-on-sale`}
              label="On sale"
              count={options.on_sale_count}
              checked={state.onSale}
              onChange={(checked) => onChange({ onSale: checked })}
            />
          )}
        </div>
      </Section>

      {hasPrice && (
        <Section title="Price">
          <PriceRange options={options} state={state} onChange={onChange} idPrefix={idPrefix} />
        </Section>
      )}

      {options.sizes.length > 0 && (
        <Section title="Size">
          <PillGroup
            values={options.sizes}
            selected={state.sizes}
            onToggle={(size) => onChange({ sizes: toggle(state.sizes, size) })}
          />
        </Section>
      )}

      {options.colours.length > 0 && (
        <Section title="Colour">
          <PillGroup
            values={options.colours}
            selected={state.colours}
            onToggle={(colour) => onChange({ colours: toggle(state.colours, colour) })}
            withSwatch
          />
        </Section>
      )}
    </div>
  );
}

function CategoryOption({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        "flex min-h-10 items-center justify-between gap-3 rounded-md px-2 text-left text-sm transition-colors hover:bg-ink/5",
        selected ? "font-semibold text-ink" : "text-ink-soft",
      )}
    >
      <span>{label}</span>
      {count !== undefined && <span className="text-xs text-ink-soft/60">{count}</span>}
    </button>
  );
}

function CheckRow({
  id,
  label,
  count,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm text-ink">
      <span className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded border border-ink/30 bg-white text-cream transition-colors peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold peer-checked:[&>svg]:opacity-100"
        >
          <Check size={13} className="opacity-0" />
        </span>
        {label}
      </span>
      {count !== undefined && <span className="text-xs text-ink-soft/60">{count}</span>}
    </label>
  );
}

function PillGroup({
  values,
  selected,
  onToggle,
  withSwatch,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  withSwatch?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // A picked option is never hidden behind "Show all", so what's applied is always visible.
  const visible = expanded
    ? values
    : values.filter((value, index) => index < COLLAPSED_LIMIT || selected.includes(value));
  const hidden = values.length - visible.length;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visible.map((value) => {
          const active = selected.includes(value);
          const swatch = withSwatch ? colourSwatch(value) : null;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(value)}
              className={clsx(PILL, active ? PILL_ON : PILL_OFF)}
            >
              {swatch && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-ink/25"
                  style={{ backgroundColor: swatch }}
                />
              )}
              {value}
            </button>
          );
        })}
      </div>
      {(hidden > 0 || expanded) && values.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-3 min-h-10 text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          {expanded ? "Show fewer" : `Show all ${values.length}`}
        </button>
      )}
    </div>
  );
}

function PriceRange({
  options,
  state,
  onChange,
  idPrefix,
}: {
  options: ProductFilterOptions;
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  idPrefix: string;
}) {
  const [minText, setMinText] = useState(penceToPoundsInput(state.minPence));
  const [maxText, setMaxText] = useState(penceToPoundsInput(state.maxPence));

  // The inputs are free text while typing but follow the applied range when it
  // changes from elsewhere (a preset, a removed chip, "Clear all") — synced
  // during render, not in an effect, so they never show a stale value.
  const [applied, setApplied] = useState({ min: state.minPence, max: state.maxPence });
  if (applied.min !== state.minPence || applied.max !== state.maxPence) {
    setApplied({ min: state.minPence, max: state.maxPence });
    setMinText(penceToPoundsInput(state.minPence));
    setMaxText(penceToPoundsInput(state.maxPence));
  }

  const commit = () => {
    let min = poundsInputToPence(minText);
    let max = poundsInputToPence(maxText);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    if (min !== state.minPence || max !== state.maxPence) onChange({ minPence: min, maxPence: max });
  };

  const presets = pricePresets(options.price.min_pence, options.price.max_pence);
  const lowest = options.price.min_pence !== null ? Math.floor(options.price.min_pence / 100) : undefined;
  const highest = options.price.max_pence !== null ? Math.ceil(options.price.max_pence / 100) : undefined;

  const input =
    "h-11 w-full rounded-md border border-ink/20 bg-white pl-7 pr-2 text-base outline-none focus:border-gold sm:text-sm";

  return (
    <div className="space-y-3">
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const active = state.minPence === preset.min && state.maxPence === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange(active ? { minPence: null, maxPence: null } : { minPence: preset.min, maxPence: preset.max })
                }
                className={clsx(PILL, active ? PILL_ON : PILL_OFF)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <label htmlFor={`${idPrefix}-min-price`} className="sr-only">
            Minimum price in pounds
          </label>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
            £
          </span>
          <input
            id={`${idPrefix}-min-price`}
            type="text"
            inputMode="decimal"
            placeholder={lowest !== undefined ? String(lowest) : "Min"}
            value={minText}
            onChange={(e) => setMinText(sanitizeNumeric(e.target.value, { decimal: true }))}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className={input}
          />
        </div>
        <span aria-hidden="true" className="text-ink-soft/50">
          –
        </span>
        <div className="relative flex-1">
          <label htmlFor={`${idPrefix}-max-price`} className="sr-only">
            Maximum price in pounds
          </label>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
            £
          </span>
          <input
            id={`${idPrefix}-max-price`}
            type="text"
            inputMode="decimal"
            placeholder={highest !== undefined ? String(highest) : "Max"}
            value={maxText}
            onChange={(e) => setMaxText(sanitizeNumeric(e.target.value, { decimal: true }))}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className={input}
          />
        </div>
      </div>
    </div>
  );
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** The applied filters as removable chips, plus "Clear all". Renders nothing when nothing's applied. */
export function ActiveFilterChips({
  state,
  scope,
  options,
  onChange,
  onClear,
}: {
  state: FilterState;
  scope: ListingScope;
  options: ProductFilterOptions | null;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}) {
  const chips: Chip[] = [];

  if (state.category && !scope.category) {
    const name = options?.categories.find((c) => c.slug === state.category)?.name ?? state.category;
    chips.push({ key: "category", label: name, onRemove: () => onChange({ category: null }) });
  }
  if (!scope.brand) {
    state.brands.forEach((slug) =>
      chips.push({
        key: `brand-${slug}`,
        label: options?.brands.find((b) => b.slug === slug)?.name ?? slug,
        onRemove: () => onChange({ brands: state.brands.filter((b) => b !== slug) }),
      }),
    );
  }
  state.sizes.forEach((size) =>
    chips.push({
      key: `size-${size}`,
      label: `Size ${size}`,
      onRemove: () => onChange({ sizes: state.sizes.filter((s) => s !== size) }),
    }),
  );
  state.colours.forEach((colour) =>
    chips.push({
      key: `colour-${colour}`,
      label: colour,
      onRemove: () => onChange({ colours: state.colours.filter((c) => c !== colour) }),
    }),
  );
  if (state.minPence !== null || state.maxPence !== null) {
    chips.push({
      key: "price",
      label: priceRangeLabel(state.minPence, state.maxPence),
      onRemove: () => onChange({ minPence: null, maxPence: null }),
    });
  }
  if (state.inStock) chips.push({ key: "stock", label: "In stock", onRemove: () => onChange({ inStock: false }) });
  if (state.onSale && !scope.onSaleOnly) {
    chips.push({ key: "sale", label: "On sale", onRemove: () => onChange({ onSale: false }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Applied filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink/5 px-3 text-sm text-ink transition-colors hover:bg-ink/10"
        >
          {chip.label}
          <X size={14} aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="min-h-9 px-2 text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}
