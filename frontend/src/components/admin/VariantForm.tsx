"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, fieldError } from "@/lib/api";
import { Input } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { Button } from "@/components/ui/Button";
import type { ProductVariant } from "@/lib/types";

interface VariantFormProps {
  productId: number;
  variant?: ProductVariant;
  onSaved: () => void;
  onCancel: () => void;
}

export function VariantForm({ productId, variant, onSaved, onCancel }: VariantFormProps) {
  const [form, setForm] = useState({
    sku: variant?.sku ?? "",
    size: variant?.size ?? "",
    colour: variant?.colour ?? "",
    priceOverride: variant?.price_pence ? (variant.price_pence / 100).toFixed(2) : "",
    stock_quantity: variant ? String(variant.stock_quantity) : "0",
    // Regression guard: this used to default to "5" for every variant, so opening
    // "Edit" and saving silently reset an already-configured threshold back to 5.
    low_stock_threshold: variant ? String(variant.low_stock_threshold) : "5",
    is_active: variant?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const payload = {
      sku: form.sku,
      size: form.size || null,
      colour: form.colour || null,
      price_override_pence: form.priceOverride ? Math.round(Number(form.priceOverride) * 100) : null,
      stock_quantity: Number(form.stock_quantity),
      low_stock_threshold: Number(form.low_stock_threshold),
      is_active: form.is_active,
    };

    try {
      if (variant) {
        await api.put(`/api/admin/variants/${variant.id}`, payload);
      } else {
        await api.post(`/api/admin/products/${productId}/variants`, payload);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? {});
        setFormError(err.errors ? null : err.message);
      } else {
        setFormError("Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gold/40 bg-gold-soft/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="SKU"
          required
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          error={fieldError(errors, "sku")}
        />
        <NumberField
          label="Price override (£, optional)"
          decimal
          value={form.priceOverride}
          onChange={(value) => setForm((f) => ({ ...f, priceOverride: value }))}
          error={fieldError(errors, "price_override_pence")}
        />
        <Input
          label="Size"
          value={form.size}
          onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
          error={fieldError(errors, "size")}
        />
        <Input
          label="Colour"
          value={form.colour}
          onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))}
          error={fieldError(errors, "colour")}
        />
        <NumberField
          label="Stock quantity"
          required
          value={form.stock_quantity}
          onChange={(value) => setForm((f) => ({ ...f, stock_quantity: value }))}
          error={fieldError(errors, "stock_quantity")}
        />
        <NumberField
          label="Low stock threshold"
          value={form.low_stock_threshold}
          onChange={(value) => setForm((f) => ({ ...f, low_stock_threshold: value }))}
          error={fieldError(errors, "low_stock_threshold")}
        />
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="h-5 w-5 rounded border-ink/30 accent-ink"
        />
        Active
      </label>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="sm" loading={submitting}>
          Save variant
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
