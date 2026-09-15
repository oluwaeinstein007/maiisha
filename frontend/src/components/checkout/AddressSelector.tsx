"use client";

import { useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { AddressForm } from "@/components/account/AddressForm";
import type { Address } from "@/lib/types";

interface AddressSelectorProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function AddressSelector({ selectedId, onSelect }: AddressSelectorProps) {
  const { data: addresses, mutate } = useSWR<Address[]>("/api/addresses", swrFetcher);
  const [addingNew, setAddingNew] = useState(false);

  if (!addresses) {
    return <p className="text-sm text-ink-soft">Loading addresses…</p>;
  }

  if (addresses.length === 0 && !addingNew) {
    return (
      <div>
        <p className="text-sm text-ink-soft">You don&apos;t have a saved address yet.</p>
        <Button size="sm" className="mt-3" onClick={() => setAddingNew(true)}>
          Add delivery address
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <label
          key={address.id}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            selectedId === address.id ? "border-gold bg-gold-soft/10" : "border-ink/15"
          }`}
        >
          <input
            type="radio"
            name="address"
            className="mt-1"
            checked={selectedId === address.id}
            onChange={() => onSelect(address.id)}
          />
          <div className="text-sm">
            <p className="font-medium text-ink">{address.label || address.full_name}</p>
            <p className="text-ink-soft">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.postcode}
            </p>
          </div>
        </label>
      ))}

      {addingNew ? (
        <AddressForm
          onCancel={() => setAddingNew(false)}
          onSaved={async () => {
            const updated = await mutate();
            setAddingNew(false);
            const newest = updated?.[updated.length - 1];
            if (newest) onSelect(newest.id);
          }}
        />
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="text-sm text-ink-soft underline hover:text-gold"
        >
          + Add a new address
        </button>
      )}
    </div>
  );
}
