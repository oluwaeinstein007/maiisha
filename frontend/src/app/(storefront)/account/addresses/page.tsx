"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Star, Trash2 } from "lucide-react";
import { api, swrFetcher } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { AddressForm } from "@/components/account/AddressForm";
import type { Address } from "@/lib/types";

export default function AddressesPage() {
  const { data: addresses, mutate } = useSWR<Address[]>("/api/addresses", swrFetcher);
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this address?")) return;
    await api.delete(`/api/addresses/${id}`);
    mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Addresses</h2>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing("new")}>
            Add address
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-4">
          <AddressForm
            address={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              mutate();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {!addresses ? (
        <p className="mt-4 text-sm text-ink-soft">Loading…</p>
      ) : addresses.length === 0 && editing === null ? (
        <p className="mt-4 text-sm text-ink-soft">No saved addresses yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-xl border border-ink/10 p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-ink">
                  {address.label || address.full_name}
                  {address.is_default && (
                    <Star size={12} className="ml-1.5 inline text-gold" fill="currentColor" />
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(address)}
                    className="text-ink-soft/60 hover:text-ink"
                    aria-label="Edit address"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="text-ink-soft/60 hover:text-red-600"
                    aria-label="Delete address"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {address.full_name}
                <br />
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
                <br />
                {address.city}, {address.postcode}
                <br />
                {address.country}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
