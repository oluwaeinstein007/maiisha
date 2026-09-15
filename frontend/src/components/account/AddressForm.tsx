"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, fieldError } from "@/lib/api";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Address } from "@/lib/types";

interface AddressFormProps {
  address?: Address;
  onSaved: () => void;
  onCancel: () => void;
}

// UK-only at launch (PRD §1.1/§7.2) — the backend validates `country` as a
// 2-letter ISO code. A single option for now; more can be added once
// international delivery zones are switched on (PRD §8).
const COUNTRY_OPTIONS = [{ code: "GB", label: "United Kingdom" }];

const emptyForm = {
  label: "",
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  country: "GB",
  phone: "",
  is_default: false,
};

export function AddressForm({ address, onSaved, onCancel }: AddressFormProps) {
  const [form, setForm] = useState(
    address
      ? {
          label: address.label ?? "",
          full_name: address.full_name,
          line1: address.line1,
          line2: address.line2 ?? "",
          city: address.city,
          postcode: address.postcode,
          country: address.country,
          phone: address.phone ?? "",
          is_default: address.is_default,
        }
      : emptyForm,
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const update =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({
        ...f,
        [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    try {
      if (address) {
        await api.put(`/api/addresses/${address.id}`, form);
      } else {
        await api.post("/api/addresses", form);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors ?? {});
        setFormError(err.errors ? null : err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink/10 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Label (e.g. Home)"
          value={form.label}
          onChange={update("label")}
          error={fieldError(errors, "label")}
        />
        <Input
          label="Full name"
          required
          value={form.full_name}
          onChange={update("full_name")}
          error={fieldError(errors, "full_name")}
        />
      </div>
      <Input
        label="Address line 1"
        required
        value={form.line1}
        onChange={update("line1")}
        error={fieldError(errors, "line1")}
      />
      <Input
        label="Address line 2 (optional)"
        value={form.line2}
        onChange={update("line2")}
        error={fieldError(errors, "line2")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="City"
          required
          value={form.city}
          onChange={update("city")}
          error={fieldError(errors, "city")}
        />
        <Input
          label="Postcode"
          required
          value={form.postcode}
          onChange={update("postcode")}
          error={fieldError(errors, "postcode")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Country"
          required
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
          error={fieldError(errors, "country")}
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </Select>
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={update("phone")}
          error={fieldError(errors, "phone")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={update("is_default")}
          className="h-4 w-4 rounded border-ink/30"
        />
        Set as default address
      </label>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          Save address
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
