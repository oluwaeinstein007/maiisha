"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { AlertTriangle, Plus, X } from "lucide-react";
import { api, ApiError, apiResource, fieldError, swrFetcherResource } from "@/lib/api";
import { formatPence } from "@/lib/money";
import { describeSchedule, WEEKDAY_SHORT, WEEKDAY_LONG } from "@/lib/sale";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { Brand, Category, PaginatedResponse, Product, Sale, SaleScope } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";

interface SaleFormProps {
  sale?: Sale;
  onSaved: (sale: Sale) => void;
  onCancel: () => void;
}

/**
 * How a sale switches on and off:
 *  - manual: the admin switches it on and off — for Christmas, Ileya, Black Friday…
 *  - dates:  it starts and ends by itself between two moments.
 *  - weekly: it runs on certain weekdays, e.g. a "Monday deal".
 */
type Mode = "manual" | "dates" | "weekly";

interface FormState {
  name: string;
  description: string;
  type: "percentage" | "fixed";
  /** Percent points, or pounds when fixed. */
  value: string;
  applies_to: SaleScope;
  category_ids: number[];
  brand_ids: number[];
  products: Array<{ id: number; name: string }>;
  mode: Mode;
  /** Wall-clock time in the shop's timezone, "YYYY-MM-DDTHH:mm" — what <input type=datetime-local> reads and writes. */
  starts_at: string;
  ends_at: string;
  weekdays: number[];
  is_active: boolean;
}

/** Campaign names worth one tap. They only fill in the name — nothing about a sale is automatic unless chosen. */
const NAME_SUGGESTIONS = ["Christmas Sale", "Ileya Sale", "Black Friday", "Boxing Day Sale", "New Year Sale"];

function initialMode(sale?: Sale): Mode {
  if (sale?.active_weekdays?.length) return "weekly";
  if (sale?.starts_at_local || sale?.ends_at_local) return "dates";
  return "manual";
}

function initialState(sale?: Sale): FormState {
  return {
    name: sale?.name ?? "",
    description: sale?.description ?? "",
    type: sale?.type ?? "percentage",
    value: sale ? String(sale.type === "fixed" ? sale.value / 100 : sale.value) : "",
    applies_to: sale?.applies_to ?? "all",
    category_ids: sale?.category_ids ?? [],
    brand_ids: sale?.brand_ids ?? [],
    products: sale?.products ?? [],
    mode: initialMode(sale),
    starts_at: sale?.starts_at_local ?? "",
    ends_at: sale?.ends_at_local ?? "",
    weekdays: sale?.active_weekdays ?? [],
    // A new sale starts as a draft: nothing changes in the shop until it's switched on.
    is_active: sale?.is_active ?? false,
  };
}

/** Half-up integer maths, identical to the backend, so the preview never disagrees with the shop. */
function previewPrice(basePence: number, type: FormState["type"], value: number): number {
  if (!Number.isFinite(value) || value <= 0) return basePence;
  return type === "percentage"
    ? basePence - Math.floor((basePence * value + 50) / 100)
    : Math.max(0, basePence - Math.round(value * 100));
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-ink/10 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A radio presented as a tappable card, for choices that need a sentence of explanation. */
function ChoiceCard({
  name,
  checked,
  onSelect,
  title,
  hint,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={clsx(
        "flex min-h-16 cursor-pointer flex-col justify-center rounded-lg border px-4 py-3 text-sm transition-colors",
        checked ? "border-ink bg-ink/5" : "border-ink/20 hover:border-ink",
      )}
    >
      <span className="flex items-center gap-2 font-medium text-ink">
        <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-4 w-4 accent-ink" />
        {title}
      </span>
      <span className="ml-6 text-xs text-ink-soft">{hint}</span>
    </label>
  );
}

export function SaleForm({ sale, onSaved, onCancel }: SaleFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(sale));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  const valueNumber = Number(form.value);
  const examplePrice = 5000;
  const discounted = previewPrice(examplePrice, form.type, valueNumber);

  const nothingChosen =
    form.applies_to === "selected" &&
    form.category_ids.length === 0 &&
    form.brand_ids.length === 0 &&
    form.products.length === 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    // Only what the chosen mode uses is sent — a manual sale never carries stale dates.
    const usesDates = form.mode !== "manual";
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      value: form.type === "fixed" ? Math.round(valueNumber * 100) : valueNumber,
      applies_to: form.applies_to,
      category_ids: form.applies_to === "selected" ? form.category_ids : [],
      brand_ids: form.applies_to === "selected" ? form.brand_ids : [],
      product_ids: form.applies_to === "selected" ? form.products.map((p) => p.id) : [],
      starts_at: usesDates ? form.starts_at || null : null,
      ends_at: usesDates ? form.ends_at || null : null,
      active_weekdays: form.mode === "weekly" && form.weekdays.length ? form.weekdays : null,
      is_active: form.is_active,
    };

    try {
      const saved = sale
        ? await api.put<{ data: Sale }>(`/api/admin/sales/${sale.id}`, payload)
        : await api.post<{ data: Sale }>("/api/admin/sales", payload);
      onSaved(saved.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? {});
        setFormError(err.errors ? "Some details need another look — see below." : err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const schedule = describeSchedule({
    starts_at_local: form.mode === "manual" ? null : form.starts_at || null,
    ends_at_local: form.mode === "manual" ? null : form.ends_at || null,
    active_weekdays: form.mode === "weekly" && form.weekdays.length ? form.weekdays : null,
  });

  const activeHint =
    form.mode === "manual"
      ? "Live straight away, and stays live until you switch it off."
      : form.mode === "dates"
        ? "Starts and ends on its own at the times above."
        : "Runs on its chosen days.";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-ink/10 bg-white p-4 sm:p-6">
      <Section title="Details" hint="The name and banner text appear across the top of the shop while the sale is live.">
        {!sale && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Name suggestions">
            <span className="text-xs text-ink-soft">Start from:</span>
            {NAME_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => set({ name: suggestion })}
                className="inline-flex min-h-10 items-center rounded-full border border-ink/20 px-4 text-sm text-ink hover:border-ink"
              >
                {suggestion}
              </button>
            ))}
            <button
              type="button"
              onClick={() => set({ name: form.name || "Monday Deals", mode: "weekly", weekdays: [1] })}
              className="inline-flex min-h-10 items-center rounded-full border border-ink/20 px-4 text-sm text-ink hover:border-ink"
            >
              Monday Deals (weekly)
            </button>
          </div>
        )}
        <Input
          label="Name"
          required
          maxLength={100}
          placeholder="e.g. Black Friday"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          error={fieldError(errors, "name")}
        />
        <Input
          label="Banner text (optional)"
          maxLength={255}
          placeholder="e.g. Our biggest deals of the year"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          error={fieldError(errors, "description")}
        />
      </Section>

      <Section title="Discount">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => set({ type: e.target.value as FormState["type"], value: "" })}
          >
            <option value="percentage">Percentage off (%)</option>
            <option value="fixed">Fixed amount off each item (£)</option>
          </Select>
          <NumberField
            label={form.type === "percentage" ? "Percentage (1–99)" : "Amount off each item (£)"}
            decimal={form.type === "fixed"}
            required
            value={form.value}
            onChange={(value) => set({ value })}
            error={fieldError(errors, "value")}
          />
        </div>
        {valueNumber > 0 && (
          <p className="rounded-md bg-cream px-3 py-2 text-sm text-ink-soft">
            A {formatPence(examplePrice)} item would sell for{" "}
            <span className="font-semibold text-ink">{formatPence(discounted)}</span> (was{" "}
            <s>{formatPence(examplePrice)}</s>).
          </p>
        )}
        <p className="text-xs text-ink-soft">
          If more than one sale covers an item, the best price wins — sales don&apos;t stack. A discount code
          still applies on top of the sale price at checkout.
        </p>
      </Section>

      <Section
        title="What's included"
        hint="Add lines (categories), brands and individual products — in any mix, and you can keep adding after the sale is live."
      >
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What the sale covers">
          <ChoiceCard
            name="applies_to"
            checked={form.applies_to === "all"}
            onSelect={() => set({ applies_to: "all" })}
            title="Whole shop"
            hint="Every product"
          />
          <ChoiceCard
            name="applies_to"
            checked={form.applies_to === "selected"}
            onSelect={() => set({ applies_to: "selected" })}
            title="Selected lines, brands & products"
            hint="Only what you choose below"
          />
        </div>

        {form.applies_to === "selected" && (
          <div className="space-y-5">
            {nothingChosen && (
              <p role="status" className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                Nothing chosen yet — this sale won&apos;t change any prices until you add some lines, brands or products.
              </p>
            )}
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink">
                Lines (categories) <Count n={form.category_ids.length} />
              </h3>
              <CategoryPicker form={form} set={set} />
              <p className="mt-1 text-xs text-ink-soft">A line includes its subcategories.</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink">
                Brands <Count n={form.brand_ids.length} />
              </h3>
              <BrandPicker form={form} set={set} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink">
                Products <Count n={form.products.length} />
              </h3>
              <ProductPicker form={form} set={set} />
            </div>
          </div>
        )}
      </Section>

      <Section
        title="When does it run?"
        hint="Times are UK time. Christmas, Ileya and Black Friday are best kept manual, so nothing starts without you."
      >
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="How the sale switches on">
          <ChoiceCard
            name="mode"
            checked={form.mode === "manual"}
            onSelect={() => set({ mode: "manual" })}
            title="Manual"
            hint="I switch it on and off myself"
          />
          <ChoiceCard
            name="mode"
            checked={form.mode === "dates"}
            onSelect={() => set({ mode: "dates" })}
            title="Between dates"
            hint="Starts and ends by itself"
          />
          <ChoiceCard
            name="mode"
            checked={form.mode === "weekly"}
            onSelect={() => set({ mode: "weekly" })}
            title="Weekly"
            hint="On certain days, e.g. Mondays"
          />
        </div>

        {form.mode !== "manual" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={form.mode === "weekly" ? "From (optional)" : "Starts"}
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => set({ starts_at: e.target.value })}
              error={fieldError(errors, "starts_at")}
            />
            <Input
              label={form.mode === "weekly" ? "Until (optional)" : "Ends"}
              type="datetime-local"
              value={form.ends_at}
              min={form.starts_at || undefined}
              onChange={(e) => set({ ends_at: e.target.value })}
              error={fieldError(errors, "ends_at")}
            />
          </div>
        )}

        {form.mode === "weekly" && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Days it runs</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_SHORT.map((label, index) => {
                const day = index + 1;
                const selected = form.weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={WEEKDAY_LONG[index]}
                    onClick={() =>
                      set({ weekdays: selected ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day] })
                    }
                    className={clsx(
                      "inline-flex h-11 min-w-12 items-center justify-center rounded-full border px-3 text-sm transition-colors",
                      selected ? "border-ink bg-ink text-cream" : "border-ink/20 text-ink hover:border-ink",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {fieldError(errors, "active_weekdays") && (
              <p className="mt-1 text-xs text-red-600">{fieldError(errors, "active_weekdays")}</p>
            )}
            {form.weekdays.length === 0 && (
              <p className="mt-2 text-xs text-ink-soft">Pick at least one day, or it will run every day.</p>
            )}
          </fieldset>
        )}

        <p className="rounded-md bg-cream px-3 py-2 text-sm text-ink-soft">
          <span className="font-medium text-ink">Runs:</span> {schedule}
        </p>
      </Section>

      <Section title="Status">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Status">
          <ChoiceCard
            name="status"
            checked={!form.is_active}
            onSelect={() => set({ is_active: false })}
            title="Draft — off"
            hint="Saved, but no prices change. Switch it on when you're ready."
          />
          <ChoiceCard
            name="status"
            checked={form.is_active}
            onSelect={() => set({ is_active: true })}
            title="Active — on"
            hint={activeHint}
          />
        </div>
      </Section>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {sale ? "Save changes" : form.is_active ? "Create & activate" : "Save draft"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Count({ n }: { n: number }) {
  return n > 0 ? <span className="ml-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-cream">{n}</span> : null;
}

function CategoryPicker({ form, set }: { form: FormState; set: (patch: Partial<FormState>) => void }) {
  const { data: categories } = useSWR<Category[]>("/api/categories", swrFetcherResource);

  const toggle = (id: number) =>
    set({
      category_ids: form.category_ids.includes(id)
        ? form.category_ids.filter((c) => c !== id)
        : [...form.category_ids, id],
    });

  if (!categories) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <ul className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-ink/10 p-2">
      {categories.map((category) => (
        <li key={category.id}>
          <CheckRow label={category.name} checked={form.category_ids.includes(category.id)} onToggle={() => toggle(category.id)} />
          {category.children && category.children.length > 0 && (
            <ul className="ml-6 space-y-0.5">
              {category.children.map((child) => (
                <li key={child.id}>
                  <CheckRow label={child.name} checked={form.category_ids.includes(child.id)} onToggle={() => toggle(child.id)} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function BrandPicker({ form, set }: { form: FormState; set: (patch: Partial<FormState>) => void }) {
  const { data: brands } = useSWR<Brand[]>("/api/admin/brands", () => apiResource.get<Brand[]>("/api/admin/brands"));

  const toggle = (id: number) =>
    set({
      brand_ids: form.brand_ids.includes(id) ? form.brand_ids.filter((b) => b !== id) : [...form.brand_ids, id],
    });

  if (!brands) return <p className="text-sm text-ink-soft">Loading…</p>;
  if (brands.length === 0) return <p className="text-sm text-ink-soft">No brands yet — add them under Brands.</p>;

  return (
    <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-ink/10 p-2">
      {brands.map((brand) => (
        <li key={brand.id}>
          <CheckRow label={brand.name} checked={form.brand_ids.includes(brand.id)} onToggle={() => toggle(brand.id)} />
        </li>
      ))}
    </ul>
  );
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm text-ink hover:bg-ink/5">
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-5 w-5 rounded border-ink/30 accent-ink" />
      {label}
    </label>
  );
}

function ProductPicker({ form, set }: { form: FormState; set: (patch: Partial<FormState>) => void }) {
  const [query, setQuery] = useState("");
  const term = useDebouncedValue(query.trim(), 250);
  const { data: results } = useSWR(
    term.length >= 2 ? `/api/admin/products?search=${encodeURIComponent(term)}&per_page=8` : null,
    (path: string) => api.get<PaginatedResponse<Product>>(path).then((r) => r.data),
  );

  const chosen = new Set(form.products.map((p) => p.id));
  const available = results?.filter((product) => !chosen.has(product.id)) ?? [];

  return (
    <div className="space-y-3">
      {form.products.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Chosen products">
          {form.products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => set({ products: form.products.filter((p) => p.id !== product.id) })}
                aria-label={`Remove ${product.name}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink/5 px-3 text-sm text-ink hover:bg-ink/10"
              >
                {product.name}
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Input
        label="Find a product to add"
        type="search"
        placeholder="Type at least two letters…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {term.length >= 2 && results && (
        <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10">
          {available.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft">No more matches.</li>
          ) : (
            available.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => set({ products: [...form.products, { id: product.id, name: product.name }] })}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm hover:bg-ink/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{product.name}</span>
                    <span className="block text-xs text-ink-soft">
                      {product.brand ? `${product.brand.name} · ` : ""}
                      {product.category.name} · {formatPence(product.price_pence)}
                    </span>
                  </span>
                  <Plus size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
