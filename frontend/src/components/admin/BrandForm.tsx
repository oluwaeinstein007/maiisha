"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { api, apiResource, ApiError, fieldError } from "@/lib/api";
import type { Brand } from "@/lib/types";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

interface BrandFormProps {
  brand?: Brand;
  onSaved: () => void;
  onCancel: () => void;
}

export function BrandForm({ brand, onSaved, onCancel }: BrandFormProps) {
  const [form, setForm] = useState({
    name: brand?.name ?? "",
    description: brand?.description ?? "",
    sort_order: String(brand?.sort_order ?? 0),
    is_active: brand?.is_active ?? true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const previewUrl = useRef<string | null>(null);

  // A preview is a blob URL the browser holds until told otherwise.
  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  const chooseLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLogoError(null);

    if (file && !file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file && file.size > MAX_LOGO_BYTES) {
      setLogoError("That image is over 2 MB — please choose a smaller one.");
      return;
    }

    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    setLogoFile(file);
    setLogoPreview(previewUrl.current);
    setRemoveLogo(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    try {
      const saved = brand
        ? await apiResource.put<Brand>(`/api/admin/brands/${brand.id}`, payload)
        : await apiResource.post<Brand>("/api/admin/brands", payload);

      if (logoFile) {
        const data = new FormData();
        data.append("logo", logoFile);
        await api.postForm(`/api/admin/brands/${saved.id}/logo`, data);
      } else if (removeLogo && brand?.logo_url) {
        await api.delete(`/api/admin/brands/${saved.id}/logo`);
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

  const currentLogo = removeLogo ? null : (logoPreview ?? brand?.logo_url ?? null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-ink/10 bg-white p-4 sm:p-6">
      <Input
        label="Brand name"
        required
        maxLength={100}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        error={fieldError(errors, "name")}
      />

      <Textarea
        label="Description (optional)"
        maxLength={2000}
        hint="Shown on the brand's page and in the Brands list."
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        error={fieldError(errors, "description")}
      />

      <div>
        <p className="text-sm font-medium text-ink">Logo (optional)</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {logoPreview ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-ink/10 bg-white">
              <Image src={logoPreview} alt="New logo preview" fill unoptimized className="object-contain p-2" />
            </div>
          ) : (
            <BrandMark name={form.name || "Brand"} logoUrl={currentLogo} />
          )}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-ink/20 px-4 text-sm text-ink hover:border-ink">
              {currentLogo ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" onChange={chooseLogo} className="sr-only" />
            </label>
            {currentLogo && (
              <button
                type="button"
                onClick={() => {
                  if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
                  previewUrl.current = null;
                  setLogoFile(null);
                  setLogoPreview(null);
                  setRemoveLogo(true);
                }}
                className="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-ink-soft hover:bg-ink/5 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-soft/70">PNG, JPG or WebP, up to 2 MB. Square works best.</p>
        {(logoError || fieldError(errors, "logo")) && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {logoError ?? fieldError(errors, "logo")}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Display order"
          hint="Lower numbers come first on the Brands page."
          value={form.sort_order}
          onChange={(value) => setForm((f) => ({ ...f, sort_order: value }))}
          error={fieldError(errors, "sort_order")}
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="h-5 w-5 rounded border-ink/30 accent-ink"
        />
        Show this brand in the shop
      </label>
      <p className="-mt-3 text-xs text-ink-soft">
        Switching a brand off hides its page, filter and label — its products stay on sale.
      </p>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {brand ? "Save changes" : "Create brand"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
