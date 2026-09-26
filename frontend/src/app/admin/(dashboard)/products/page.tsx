"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError, swrFetcher, buildQuery } from "@/lib/api";
import type { PaginatedResponse, Product } from "@/lib/types";
import { IconAction } from "@/components/admin/IconAction";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { ResponsiveTable, type TableColumn } from "@/components/admin/ResponsiveTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PriceTag } from "@/components/ui/PriceTag";

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, mutate } = useSWR<PaginatedResponse<Product>>(
    `/api/admin/products${buildQuery({ search, page, per_page: 20 })}`,
    swrFetcher,
    { keepPreviousData: true },
  );

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete “${product.name}”? This can't be undone.`)) return;
    setActionError(null);
    setDeletingId(product.id);
    try {
      await api.delete(`/api/admin/products/${product.id}`);
      await mutate();
    } catch (err) {
      // A product with order history is refused (409) with a message explaining
      // why — surface that verbatim rather than a generic "something went wrong".
      setActionError(err instanceof ApiError ? err.message : "Could not delete that product.");
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumn<Product>[] = [
    {
      header: "Product",
      card: "title",
      cell: (product) => (
        <Link href={`/admin/products/${product.id}`} className="font-medium text-ink hover:text-gold">
          {product.name}
        </Link>
      ),
    },
    { header: "Category", cell: (product) => product.category.name },
    { header: "Brand", cell: (product) => product.brand?.name ?? "—" },
    {
      // The price a shopper pays right now: while a sale is running this shows the
      // sale price with the normal one struck through, so it's clear why it differs
      // from the price you set.
      header: "Price",
      cell: (product) => <PriceTag price={product.min_price_pence} compareAt={product.compare_at_price_pence} />,
    },
    {
      header: "Stock",
      cell: (product) =>
        product.in_stock === false ? (
          <span className="text-red-600">
            Out of stock
            {product.hide_when_out_of_stock && <span className="ml-1 text-ink-soft/60">(hidden)</span>}
          </span>
        ) : (
          "In stock"
        ),
    },
    {
      header: "Status",
      card: "badge",
      cell: (product) => (
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            product.is_active === false ? "bg-neutral-200 text-neutral-600" : "bg-green-100 text-green-800"
          }`}
        >
          {product.is_active === false ? "Inactive" : "Active"}
        </span>
      ),
    },
    {
      header: "",
      card: "actions",
      cell: (product) => (
        <div className="flex justify-end">
          <IconAction label={`Edit ${product.name}`} href={`/admin/products/${product.id}`}>
            <Pencil size={15} />
          </IconAction>
          <IconAction danger label={`Delete ${product.name}`} onClick={() => handleDelete(product)}>
            {deletingId === product.id ? (
              <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Trash2 size={15} />
            )}
          </IconAction>
        </div>
      ),
    },
  ];

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
          type="search"
          aria-label="Search products"
          placeholder="Search products…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {actionError}
        </p>
      )}

      <div className="mt-6">
        {data ? (
          <ResponsiveTable rows={data.data} columns={columns} getKey={(product) => product.id} empty="No products found." />
        ) : (
          <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>

      {data && <PaginationControls page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />}
    </div>
  );
}
