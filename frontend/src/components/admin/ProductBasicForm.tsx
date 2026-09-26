"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { apiResource, ApiError, fieldError, swrFetcherResource } from "@/lib/api";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { Button } from "@/components/ui/Button";
import type { Brand, Category, Product } from "@/lib/types";

interface ProductBasicFormProps {
  product?: Product;
  onSaved: (product: Product) => void;
}

export function ProductBasicForm({ product, onSaved }: ProductBasicFormProps) {
  const { data: categories } = useSWR<Category[]>("/api/categories", swrFetcherResource);
  const { data: brands } = useSWR<Brand[]>("/api/admin/brands", swrFetcherResource);

  const [form, setForm] = useState({
    category_id: product?.category_id ?? product?.category.id ?? "",
    brand_id: product?.brand_id ? String(product.brand_id) : "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? (product.price_pence / 100).toFixed(2) : "",
    is_featured: product?.is_featured ?? false,
    is_active: product?.is_active ?? true,
    hide_when_out_of_stock: product?.hide_when_out_of_stock ?? false,
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
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      name: form.name,
      description: form.description || null,
      price_pence: Math.round(Number(form.price) * 100),
      is_featured: form.is_featured,
      is_active: form.is_active,
      hide_when_out_of_stock: form.hide_when_out_of_stock,
    };

    try {
      const saved = product
        ? await apiResource.put<Product>(`/api/admin/products/${product.id}`, payload)
        : await apiResource.post<Product>("/api/admin/products", payload);
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

      <Select
        label="Brand (optional)"
        value={form.brand_id}
        onChange={(e) => setForm((f) => ({ ...f, brand_id: e.target.value }))}
        error={fieldError(errors, "brand_id")}
        hint="Manage brands under Brands in the menu."
      >
        <option value="">No brand</option>
        {brands?.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.is_active ? "" : " (hidden)"}
          </option>
        ))}
      </Select>

      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        error={fieldError(errors, "description")}
      />

      <NumberField
        label="Base price (£)"
        decimal
        required
        value={form.price}
        onChange={(value) => setForm((f) => ({ ...f, price: value }))}
        error={fieldError(errors, "price_pence")}
        hint="Variants can override this price individually."
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-6">
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
            className="h-5 w-5 rounded border-ink/30 accent-ink"
          />
          Featured on homepage
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-5 w-5 rounded border-ink/30 accent-ink"
          />
          Active (visible in store)
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={form.hide_when_out_of_stock}
            onChange={(e) => setForm((f) => ({ ...f, hide_when_out_of_stock: e.target.checked }))}
            className="h-5 w-5 rounded border-ink/30 accent-ink"
          />
          Hide from store when out of stock
        </label>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <Button type="submit" loading={submitting}>
        {product ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}
