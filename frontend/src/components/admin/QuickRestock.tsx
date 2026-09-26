"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { api, ApiError } from "@/lib/api";
import type { AdminStockRow } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";

const DEFAULT_QUANTITY = "10";

function RestockRow({
  row,
  onRestocked,
}: {
  row: AdminStockRow;
  onRestocked: (row: AdminStockRow, added: number, nowInStock: number) => void;
}) {
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = Number(quantity);
  const valid = Number.isInteger(amount) && amount >= 1;
  const variantLabel = [row.size, row.colour].filter(Boolean).join(" / ");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const response = await api.post<{ data: { stock_quantity: number } }>(
        `/api/admin/variants/${row.variant_id}/restock`,
        { quantity: amount },
      );
      onRestocked(row, amount, response.data.stock_quantity);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <Link
            href={`/admin/products/${row.product_id}`}
            className="block truncate text-sm font-medium text-ink hover:text-gold"
          >
            {row.product_name}
          </Link>
          <p className="text-xs text-ink-soft">
            {[variantLabel, row.sku].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
            row.stock_quantity === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
          )}
        >
          {row.stock_quantity === 0 ? "Out of stock" : `${row.stock_quantity} left`}
        </span>
      </div>

      <form onSubmit={submit} className="mt-2 flex items-center gap-2">
        <div className="w-24">
          <NumberField
            aria-label={`Units to add to ${row.product_name} ${row.sku}`}
            value={quantity}
            onChange={setQuantity}
            className="text-center"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" loading={saving} disabled={!valid}>
          Add stock
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}

/**
 * Top-up stock straight from the dashboard: a count of units that just arrived,
 * added to whatever is there now (the server increments, so orders placed since
 * this list loaded aren't overwritten). Out-of-stock rows come first — those are
 * the ones costing sales, and the ones shoppers are waiting on.
 */
export function QuickRestock({
  rows,
  onChanged,
}: {
  rows: AdminStockRow[];
  onChanged: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  const handleRestocked = (row: AdminStockRow, added: number, nowInStock: number) => {
    setNotice(`Added ${added} to ${row.product_name} (${row.sku}) — ${nowInStock} in stock now.`);
    onChanged();
  };

  return (
    <>
      <p role="status" aria-live="polite" className={clsx("text-xs text-emerald-700", notice ? "mt-2" : "sr-only")}>
        {notice}
      </p>
      <ul className="mt-1 divide-y divide-ink/10">
        {rows.map((row) => (
          <RestockRow key={row.variant_id} row={row} onRestocked={handleRestocked} />
        ))}
      </ul>
    </>
  );
}
