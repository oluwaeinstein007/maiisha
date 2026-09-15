"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, XCircle } from "lucide-react";
import { api, swrFetcherResource } from "@/lib/api";
import { formatDate, formatPence } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { DiscountCodeForm } from "@/components/admin/DiscountCodeForm";
import type { DiscountCode } from "@/lib/types";

export default function AdminDiscountCodesPage() {
  const { data: codes, mutate } = useSWR<DiscountCode[]>(
    "/api/admin/discount-codes",
    swrFetcherResource,
  );
  const [editing, setEditing] = useState<DiscountCode | "new" | null>(null);

  const handleDeactivate = async (id: number) => {
    if (!confirm("Deactivate this discount code? Existing usage history is kept.")) return;
    await api.delete(`/api/admin/discount-codes/${id}`);
    mutate();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
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

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft/60">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {codes?.map((code) => (
              <tr key={code.id} className="hover:bg-ink/5">
                <td className="px-4 py-3 font-medium text-ink">{code.code}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {code.type === "percentage" ? `${code.value}%` : formatPence(code.value)}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {code.times_used ?? 0}
                  {code.usage_limit ? ` / ${code.usage_limit}` : ""}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {code.expires_at ? formatDate(code.expires_at) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      code.is_active ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {code.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditing(code)}
                      className="text-ink-soft/60 hover:text-ink"
                      aria-label="Edit code"
                    >
                      <Pencil size={14} />
                    </button>
                    {code.is_active && (
                      <button
                        onClick={() => handleDeactivate(code.id)}
                        className="text-ink-soft/60 hover:text-red-600"
                        aria-label="Deactivate code"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes?.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-soft">No discount codes yet.</p>
        )}
      </div>
    </div>
  );
}
