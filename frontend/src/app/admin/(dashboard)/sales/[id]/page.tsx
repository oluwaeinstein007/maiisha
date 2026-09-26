"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { swrFetcherResource } from "@/lib/api";
import type { Sale } from "@/lib/types";
import { SaleForm } from "@/components/admin/SaleForm";

export default function EditSalePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: sale, error } = useSWR<Sale>(`/api/admin/sales/${params.id}`, swrFetcherResource, {
    revalidateOnFocus: false,
  });

  if (error) return <p className="text-sm text-red-600">Could not load this sale.</p>;
  if (!sale) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/sales" className="text-xs text-ink-soft hover:text-gold">
        ← All sales
      </Link>
      <h1 className="mt-1 font-display text-2xl text-ink">{sale.name}</h1>
      <div className="mt-6">
        <SaleForm sale={sale} onSaved={() => router.push("/admin/sales")} onCancel={() => router.push("/admin/sales")} />
      </div>
    </div>
  );
}
