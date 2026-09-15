"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { swrFetcher, buildQuery } from "@/lib/api";
import { formatPence } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import type { PaginatedResponse, Product } from "@/lib/types";

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data } = useSWR<PaginatedResponse<Product>>(
    `/api/admin/products${buildQuery({ search, page, per_page: 20 })}`,
    swrFetcher,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Products</h1>
        <Link href="/admin/products/new">
          <Button>
            <Plus size={16} /> New product
          </Button>
        </Link>
      </div>

      <div className="mt-4 max-w-sm">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft/60">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {data?.data.map((product) => (
              <tr key={product.id} className="hover:bg-ink/5">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-medium text-ink hover:text-gold"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{product.category.name}</td>
                <td className="px-4 py-3 text-ink-soft">{formatPence(product.min_price_pence)}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {product.in_stock === false ? (
                    <span className="text-red-600">Out of stock</span>
                  ) : (
                    "In stock"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      product.is_active === false
                        ? "bg-neutral-200 text-neutral-600"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {product.is_active === false ? "Inactive" : "Active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.data.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-soft">No products found.</p>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: data.meta.last_page }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={
                p === data.meta.current_page
                  ? "flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm text-cream"
                  : "flex h-9 w-9 items-center justify-center rounded-full text-sm text-ink-soft hover:bg-ink/5"
              }
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
