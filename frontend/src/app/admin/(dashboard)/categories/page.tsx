"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, swrFetcher } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { CategoryForm } from "@/components/admin/CategoryForm";
import type { Category } from "@/lib/types";

export default function AdminCategoriesPage() {
  const { data: categories, mutate } = useSWR<Category[]>("/api/categories", swrFetcher);
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
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium text-ink">{category.name}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(category)}
                  className="text-ink-soft/60 hover:text-ink"
                  aria-label="Edit category"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="text-ink-soft/60 hover:text-red-600"
                  aria-label="Delete category"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {category.children && category.children.length > 0 && (
              <ul className="divide-y divide-ink/5 border-t border-ink/10">
                {category.children.map((child) => (
                  <li key={child.id} className="flex items-center justify-between px-4 py-2.5 pl-8">
                    <p className="text-sm text-ink-soft">{child.name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(child)}
                        className="text-ink-soft/60 hover:text-ink"
                        aria-label="Edit category"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(child.id)}
                        className="text-ink-soft/60 hover:text-red-600"
                        aria-label="Delete category"
                      >
                        <Trash2 size={14} />
                      </button>
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
