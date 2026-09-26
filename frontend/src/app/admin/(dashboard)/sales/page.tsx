"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import clsx from "clsx";
import { Pencil, Plus, Power } from "lucide-react";
import { api, apiResource } from "@/lib/api";
import { describeSchedule } from "@/lib/sale";
import type { Sale, SaleStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";

type Filter = "all" | SaleStatus;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "ended", label: "Ended" },
  { key: "inactive", label: "Inactive" },
];

const STATUS_STYLES: Record<SaleStatus, string> = {
  live: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  ended: "bg-neutral-200 text-neutral-600",
  inactive: "bg-neutral-100 text-neutral-500 ring-1 ring-inset ring-neutral-300",
};

const STATUS_LABELS: Record<SaleStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
  ended: "Ended",
  inactive: "Inactive",
};

/** "Shoes, Accessories · Noor Modest · 6 products" — what the sale reaches, in the words the admin used. */
function describeScope(sale: Sale): string {
  if (sale.applies_to === "all") return "Whole shop";

  const lines = sale.categories?.map((c) => c.name) ?? [];
  const brands = sale.brands?.map((b) => b.name) ?? [];
  const products = sale.products?.length ?? 0;

  const parts = [
    lines.length ? `Lines: ${lines.join(", ")}` : null,
    brands.length ? `Brands: ${brands.join(", ")}` : null,
    products ? `${products} ${products === 1 ? "product" : "products"}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "Nothing chosen yet";
}

export default function AdminSalesPage() {
  const { data: sales, mutate, error } = useSWR<Sale[]>("/api/admin/sales", () => apiResource.get<Sale[]>("/api/admin/sales"));
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = (key: Filter) => (key === "all" ? sales?.length ?? 0 : sales?.filter((s) => s.status === key).length ?? 0);
  const visible = sales?.filter((s) => filter === "all" || s.status === filter) ?? [];

  const toggleActive = async (sale: Sale) => {
    if (
      sale.is_active &&
      !confirm(`Deactivate “${sale.name}”? Prices go back to normal straight away. You can activate it again later.`)
    ) {
      return;
    }

    setBusyId(sale.id);
    setActionError(null);
    try {
      if (sale.is_active) {
        await api.delete(`/api/admin/sales/${sale.id}`);
      } else {
        await api.post(`/api/admin/sales/${sale.id}/activate`);
      }
      await mutate();
    } catch {
      setActionError("Could not update that sale. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Sales</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Create a sale, add lines, brands and products, then activate it when you&apos;re ready — or let it run by
            dates or weekdays.
          </p>
        </div>
        <Link href="/admin/sales/new">
          <Button size="sm">
            <Plus size={14} /> New sale
          </Button>
        </Link>
      </div>

      <div className="scrollbar-hide -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by status">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={clsx(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
              filter === key ? "border-ink bg-ink text-cream" : "border-ink/20 text-ink hover:border-ink",
            )}
          >
            {label}
            <span className={clsx("text-xs", filter === key ? "text-cream/70" : "text-ink-soft/60")}>{counts(key)}</span>
          </button>
        ))}
      </div>

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {error && !sales && <p className="mt-6 text-sm text-red-600">Could not load sales.</p>}
      {!sales && !error && <p className="mt-6 text-sm text-ink-soft">Loading…</p>}

      {sales && visible.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center">
          <p className="text-sm text-ink-soft">{sales.length === 0 ? "No sales yet." : `No ${filter} sales.`}</p>
          {sales.length === 0 && (
            <Link href="/admin/sales/new" className="mt-3 inline-block text-sm text-ink underline hover:text-gold">
              Create your first sale
            </Link>
          )}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {visible.map((sale) => (
          <li key={sale.id} className="rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/sales/${sale.id}`}
                    className="inline-flex min-h-10 items-center font-display text-lg text-ink hover:text-gold"
                  >
                    {sale.name}
                  </Link>
                  <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_STYLES[sale.status])}>
                    {STATUS_LABELS[sale.status]}
                  </span>
                </div>
                {sale.description && <p className="mt-0.5 text-sm text-ink-soft">{sale.description}</p>}
              </div>
              <p className="shrink-0 text-lg font-semibold text-ink">{sale.discount_label}</p>
            </div>

            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="shrink-0 text-ink-soft/70">Covers</dt>
                <dd className="min-w-0 text-ink">{describeScope(sale)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-ink-soft/70">Runs</dt>
                <dd className="min-w-0 text-ink">{describeSchedule(sale)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/admin/sales/${sale.id}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm text-ink hover:border-ink"
              >
                <Pencil size={14} aria-hidden="true" /> Edit &amp; add items
              </Link>
              <button
                type="button"
                disabled={busyId === sale.id}
                onClick={() => toggleActive(sale)}
                className={clsx(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors disabled:opacity-50",
                  sale.is_active
                    ? "border border-ink/20 text-ink hover:border-ink"
                    : "bg-ink text-cream hover:bg-ink-soft",
                )}
              >
                <Power size={14} aria-hidden="true" />
                {sale.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
