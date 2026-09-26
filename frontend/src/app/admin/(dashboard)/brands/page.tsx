"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError, swrFetcherResource } from "@/lib/api";
import type { Brand } from "@/lib/types";
import { BrandForm } from "@/components/admin/BrandForm";
import { IconAction } from "@/components/admin/IconAction";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";

export default function AdminBrandsPage() {
  const { data: brands, mutate, error } = useSWR<Brand[]>("/api/admin/brands", swrFetcherResource);
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Delete “${brand.name}”? This can't be undone.`)) return;
    setActionError(null);
    try {
      await api.delete(`/api/admin/brands/${brand.id}`);
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not delete that brand.");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Brands</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Label your products with a brand. Shoppers can filter by it and browse each brand&apos;s page, and a
            sale can target a whole brand.
          </p>
        </div>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} /> New brand
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-4">
          <BrandForm
            key={editing === "new" ? "new" : editing.id}
            brand={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              mutate();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {error && !brands && <p className="mt-6 text-sm text-red-600">Could not load brands.</p>}

      <div className="mt-6">
        {brands ? (
          <ResponsiveTable
            rows={brands}
            getKey={(brand) => brand.id}
            empty="No brands yet."
            columns={[
              {
                header: "Brand",
                card: "title",
                cell: (brand) => (
                  <span className="flex items-center gap-3">
                    <BrandMark name={brand.name} logoUrl={brand.logo_url} className="h-10 w-10" />
                    <span className="font-medium text-ink">{brand.name}</span>
                  </span>
                ),
              },
              { header: "Products", cell: (brand) => brand.products_count ?? 0 },
              { header: "Order", cell: (brand) => brand.sort_order },
              {
                header: "Status",
                card: "badge",
                cell: (brand) => (
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      brand.is_active ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {brand.is_active ? "Shown" : "Hidden"}
                  </span>
                ),
              },
              {
                header: "",
                card: "actions",
                cell: (brand) => (
                  <div className="flex justify-end">
                    <IconAction label={`Edit ${brand.name}`} onClick={() => setEditing(brand)}>
                      <Pencil size={15} />
                    </IconAction>
                    <IconAction danger label={`Delete ${brand.name}`} onClick={() => handleDelete(brand)}>
                      <Trash2 size={15} />
                    </IconAction>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          !error && <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>
    </div>
  );
}
