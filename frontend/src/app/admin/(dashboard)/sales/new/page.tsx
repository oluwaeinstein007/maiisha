"use client";

import { useRouter } from "next/navigation";
import { SaleForm } from "@/components/admin/SaleForm";

export default function NewSalePage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl text-ink">New sale</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Choose what&apos;s reduced and when. Prices update across the shop the moment it&apos;s live.
      </p>
      <div className="mt-6">
        <SaleForm onSaved={() => router.push("/admin/sales")} onCancel={() => router.push("/admin/sales")} />
      </div>
    </div>
  );
}
