"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, swrFetcherResource } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { IconAction } from "@/components/admin/IconAction";
import { CategoryForm } from "@/components/admin/CategoryForm";
import type { Category } from "@/lib/types";

export default function AdminCategoriesPage() {
  const { data: categories, mutate } = useSWR<Category[]>("/api/categories", swrFetcherResource);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category? Products in it will need reassigning.")) return;
    await api.delete(`/api/admin/categories/${id}`);
    mutate();
  };

  const topLevel = categories ?? [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Categories</h1>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} /> New category
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-4">
          <CategoryForm
            category={editing === "new" ? undefined : editing}
            parentOptions={topLevel}
            onSaved={() => {
              setEditing(null);
              mutate();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {topLevel.map((category) => (
          <div key={category.id} className="rounded-xl border border-ink/10 bg-white">
            <div className="flex items-center justify-between gap-2 py-1 pl-4 pr-2">
              <p className="min-w-0 truncate text-sm font-medium text-ink">{category.name}</p>
              <div className="flex shrink-0">
                <IconAction label={`Edit ${category.name}`} onClick={() => setEditing(category)}>
                  <Pencil size={15} />
                </IconAction>
                <IconAction danger label={`Delete ${category.name}`} onClick={() => handleDelete(category.id)}>
                  <Trash2 size={15} />
                </IconAction>
              </div>
            </div>
            {category.children && category.children.length > 0 && (
              <ul className="divide-y divide-ink/5 border-t border-ink/10">
                {category.children.map((child) => (
                  <li key={child.id} className="flex items-center justify-between gap-2 py-0.5 pl-8 pr-2">
                    <p className="min-w-0 truncate text-sm text-ink-soft">{child.name}</p>
                    <div className="flex shrink-0">
                      <IconAction label={`Edit ${child.name}`} onClick={() => setEditing(child)}>
                        <Pencil size={15} />
                      </IconAction>
                      <IconAction danger label={`Delete ${child.name}`} onClick={() => handleDelete(child.id)}>
                        <Trash2 size={15} />
                      </IconAction>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
