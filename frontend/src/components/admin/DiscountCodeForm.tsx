"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, fieldError } from "@/lib/api";
import { formatPence } from "@/lib/money";
import { Input, Select } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { Button } from "@/components/ui/Button";
import type { DiscountCode } from "@/lib/types";

interface DiscountCodeFormProps {
  discountCode?: DiscountCode;
  onSaved: () => void;
  onCancel: () => void;
}

export function DiscountCodeForm({ discountCode, onSaved, onCancel }: DiscountCodeFormProps) {
  const [form, setForm] = useState({
    code: discountCode?.code ?? "",
    type: discountCode?.type ?? "percentage",
    value: discountCode
      ? String(discountCode.type === "fixed" ? discountCode.value / 100 : discountCode.value)
      : "",
    usage_limit: discountCode?.usage_limit ? String(discountCode.usage_limit) : "",
    expires_at: discountCode?.expires_at ? discountCode.expires_at.slice(0, 10) : "",
    is_active: discountCode?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // What a £60 basket would save — the same rule checkout applies (a fixed code never takes more than the basket).
  const basketPence = 6000;
  const enteredValue = Number(form.value);
  const previewDiscount =
    !Number.isFinite(enteredValue) || enteredValue <= 0
      ? 0
      : form.type === "percentage"
        ? Math.round((basketPence * enteredValue) / 100)
        : Math.min(Math.round(enteredValue * 100), basketPence);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: form.type === "fixed" ? Math.round(Number(form.value) * 100) : Number(form.value),
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };

    try {
      if (discountCode) {
        await api.put(`/api/admin/discount-codes/${discountCode.id}`, payload);
      } else {
        await api.post("/api/admin/discount-codes", payload);
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink/10 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Code"
          required
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          error={fieldError(errors, "code")}
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percentage" | "fixed" }))}
        >
          <option value="percentage">Percentage off (%)</option>
          <option value="fixed">Fixed amount off (£)</option>
        </Select>
      </div>

      <NumberField
        label={form.type === "percentage" ? "Percentage (e.g. 10 for 10%)" : "Amount off the basket (£)"}
        decimal={form.type === "fixed"}
        required
        value={form.value}
        onChange={(value) => setForm((f) => ({ ...f, value }))}
        error={fieldError(errors, "value")}
        hint={form.type === "fixed" ? "Entered in pounds, e.g. 5 for £5.00 off." : "Between 1 and 100."}
      />

      {previewDiscount > 0 && (
        <p className="rounded-md bg-cream px-3 py-2 text-sm text-ink-soft">
          On a {formatPence(basketPence)} basket this takes{" "}
          <span className="font-semibold text-ink">{formatPence(previewDiscount)}</span> off, leaving{" "}
          {formatPence(basketPence - previewDiscount)}.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Usage limit (optional)"
          value={form.usage_limit}
          onChange={(value) => setForm((f) => ({ ...f, usage_limit: value }))}
          error={fieldError(errors, "usage_limit")}
        />
        <Input
          label="Expiry date (optional)"
          type="date"
          value={form.expires_at}
          onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
          error={fieldError(errors, "expires_at")}
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
        <Button type="submit" loading={submitting}>
          Save code
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
