"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatPence } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { VariantForm } from "@/components/admin/VariantForm";
import type { ProductVariant } from "@/lib/types";

interface VariantsManagerProps {
  productId: number;
  variants: ProductVariant[];
  onChanged: () => void;
}

export function VariantsManager({ productId, variants, onChanged }: VariantsManagerProps) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    await api.delete(`/api/admin/variants/${id}`);
    onChanged();
  };

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Variants</h2>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={() => setEditingId("new")}>
            <Plus size={14} /> Add variant
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {variants.map((variant) =>
          editingId === variant.id ? (
            <VariantForm
              key={variant.id}
              productId={productId}
              variant={variant}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                onChanged();
              }}
            />
          ) : (
            <div
              key={variant.id}
              className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-ink">
                  {[variant.size, variant.colour].filter(Boolean).join(" / ") || variant.sku}
                </p>
                <p className="text-xs text-ink-soft">
                  {variant.sku} · {formatPence(variant.price_pence)} · Stock {variant.stock_quantity}
                  {!variant.is_active && " · Inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(variant.id)}
                  className="text-ink-soft/60 hover:text-ink"
                  aria-label="Edit variant"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(variant.id)}
                  className="text-ink-soft/60 hover:text-red-600"
                  aria-label="Delete variant"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ),
        )}

        {editingId === "new" && (
          <VariantForm
            productId={productId}
            onCancel={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              onChanged();
            }}
          />
        )}

        {variants.length === 0 && editingId === null && (
          <p className="text-sm text-ink-soft">
            No variants yet. Add at least one so customers can select size/colour and purchase this
            product.
          </p>
        )}
      </div>
    </div>
  );
}
