"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, fieldError } from "@/lib/api";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/lib/types";

interface CategoryFormProps {
  category?: Category;
  parentOptions: Category[];
  onSaved: () => void;
  onCancel: () => void;
}

export function CategoryForm({ category, parentOptions, onSaved, onCancel }: CategoryFormProps) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    parent_id: category?.parent_id ? String(category.parent_id) : "",
    description: category?.description ?? "",
    image_path: category?.image_url ?? "",
    sort_order: "0",
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
      name: form.name,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      description: form.description || null,
      image_path: form.image_path || null,
      sort_order: Number(form.sort_order) || 0,
    };

    try {
      if (category) {
        await api.put(`/api/admin/categories/${category.id}`, payload);
      } else {
        await api.post("/api/admin/categories", payload);
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
      <Input
        label="Name"
        required
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        error={fieldError(errors, "name")}
      />
      <Select
        label="Parent category (optional)"
        value={form.parent_id}
        onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
        error={fieldError(errors, "parent_id")}
      >
        <option value="">None (top-level)</option>
        {parentOptions
          .filter((c) => c.id !== category?.id)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        label="Image URL (optional)"
        value={form.image_path}
        onChange={(e) => setForm((f) => ({ ...f, image_path: e.target.value }))}
        error={fieldError(errors, "image_path")}
      />
      <Input
        label="Sort order"
        type="number"
        value={form.sort_order}
        onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
        error={fieldError(errors, "sort_order")}
      />

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          Save category
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
