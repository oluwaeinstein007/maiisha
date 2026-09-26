"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, XCircle } from "lucide-react";
import { api, swrFetcher } from "@/lib/api";
import { formatDate, formatPence } from "@/lib/money";
import type { DiscountCode } from "@/lib/types";
import { DiscountCodeForm } from "@/components/admin/DiscountCodeForm";
import { IconAction } from "@/components/admin/IconAction";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { Button } from "@/components/ui/Button";

export default function AdminDiscountCodesPage() {
  const { data: codes, mutate } = useSWR<DiscountCode[]>("/api/admin/discount-codes", swrFetcher);
  const [editing, setEditing] = useState<DiscountCode | "new" | null>(null);

  const handleDeactivate = async (id: number) => {
    if (!confirm("Deactivate this discount code? Existing usage history is kept.")) return;
    await api.delete(`/api/admin/discount-codes/${id}`);
    mutate();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Discount codes</h1>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} /> New code
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-4">
          <DiscountCodeForm
            discountCode={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              mutate();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-6">
        {codes ? (
          <ResponsiveTable
            rows={codes}
            getKey={(code) => code.id}
            empty="No discount codes yet."
            columns={[
              { header: "Code", card: "title", cell: (code) => <span className="font-medium text-ink">{code.code}</span> },
              {
                header: "Value",
                cell: (code) => (code.type === "percentage" ? `${code.value}%` : formatPence(code.value)),
              },
              {
                header: "Usage",
                cell: (code) => `${code.usages_count ?? 0}${code.usage_limit ? ` / ${code.usage_limit}` : ""}`,
              },
              { header: "Expires", cell: (code) => (code.expires_at ? formatDate(code.expires_at) : "—") },
              {
                header: "Status",
                card: "badge",
                cell: (code) => (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      code.is_active ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {code.is_active ? "Active" : "Inactive"}
                  </span>
                ),
              },
              {
                header: "",
                card: "actions",
                cell: (code) => (
                  <div className="flex justify-end">
                    <IconAction label={`Edit ${code.code}`} onClick={() => setEditing(code)}>
                      <Pencil size={15} />
                    </IconAction>
                    {code.is_active && (
                      <IconAction danger label={`Deactivate ${code.code}`} onClick={() => handleDeactivate(code.id)}>
                        <XCircle size={15} />
                      </IconAction>
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>
    </div>
  );
}
