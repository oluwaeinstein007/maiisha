"use client";

import Link from "next/link";
import useSWR from "swr";
import { api } from "@/lib/api";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";

interface DemandRow {
  id: number;
  name: string;
  slug: string;
  wishlist_count: number;
  waiting_count: number;
  stock: number;
}

export default function AdminDemandPage() {
  const { data, error } = useSWR("/api/admin/demand", (path: string) => api.get<{ data: DemandRow[] }>(path));

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl text-ink">Demand</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What shoppers are asking for. &ldquo;Waiting&rdquo; is customers who asked to be emailed when a product is
        back in stock — restocking the top rows first wins the most sales. They&apos;re emailed automatically when
        stock is added.
      </p>

      {error && !data && <p className="mt-6 text-sm text-red-600">Could not load demand.</p>}

      <div className="mt-6">
        {data ? (
          <ResponsiveTable
            rows={data.data}
            getKey={(row) => row.id}
            empty="Nothing yet — wishlist saves and back-in-stock requests will show up here."
            columns={[
              {
                header: "Product",
                card: "title",
                cell: (row) => (
                  <Link href={`/admin/products/${row.id}`} className="hover:text-gold">
                    {row.name}
                  </Link>
                ),
              },
              {
                header: "Stock",
                card: "badge",
                cell: (row) => (
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      row.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {row.stock > 0 ? `${row.stock} in stock` : "Out of stock"}
                  </span>
                ),
              },
              { header: "Waiting for restock", cell: (row) => row.waiting_count },
              { header: "Saved to wishlists", cell: (row) => row.wishlist_count },
            ]}
          />
        ) : (
          !error && <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>
    </div>
  );
}
