"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { api, ApiError, fieldError, swrFetcher } from "@/lib/api";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Category, Product } from "@/lib/types";

interface ProductBasicFormProps {
  product?: Product;
  onSaved: (product: Product) => void;
}

export function ProductBasicForm({ product, onSaved }: ProductBasicFormProps) {
  const { data: categories } = useSWR<Category[]>("/api/categories", swrFetcher);

  const [form, setForm] = useState({
    category_id: product?.category_id ?? product?.category.id ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? (product.price_pence / 100).toFixed(2) : "",
    is_featured: product?.is_featured ?? false,
    is_active: product?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const flatCategories = (categories ?? []).flatMap((c) => [c, ...(c.children ?? [])]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const payload = {
      category_id: Number(form.category_id),
      name: form.name,
      description: form.description || null,
      price_pence: Math.round(Number(form.price) * 100),
      is_featured: form.is_featured,
      is_active: form.is_active,
    };

    try {
      const saved = product
        ? await api.put<Product>(`/api/admin/products/${product.id}`, payload)
        : await api.post<Product>("/api/admin/products", payload);
      onSaved(saved);
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink/10 bg-white p-6">
      <Input
        label="Product name"
        required
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        error={fieldError(errors, "name")}
      />

      <Select
        label="Category"
        required
        value={form.category_id}
        onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
        error={fieldError(errors, "category_id")}
      >
        <option value="">Select a category</option>
        {flatCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.parent_id ? `— ${c.name}` : c.name}
          </option>
        ))}
      </Select>

      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        error={fieldError(errors, "description")}
      />

      <Input
        label="Base price (£)"
        type="number"
        min="0"
        step="0.01"
        required
        value={form.price}
        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        error={fieldError(errors, "price_pence")}
        hint="Variants can override this price individually."
      />

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
            className="h-4 w-4 rounded border-ink/30"
          />
          Featured on homepage
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-ink/30"
          />
          Active (visible in store)
        </label>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <Button type="submit" loading={submitting}>
        {product ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}
