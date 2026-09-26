"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { API_URL, swrFetcher, buildQuery } from "@/lib/api";
import { formatDate, formatPence } from "@/lib/money";
import type { Customer, PaginatedResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { ResponsiveTable, type TableColumn } from "@/components/admin/ResponsiveTable";
import { Input } from "@/components/ui/Field";

async function downloadCustomers(search: string) {
  const response = await fetch(`${API_URL}/api/admin/customers/export${buildQuery({ search })}`, {
    credentials: "include",
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) throw new Error("The export could not be created.");

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "maiisha-customers.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const COLUMNS: TableColumn<Customer>[] = [
  {
    header: "Customer",
    card: "title",
    cell: (customer) => (
      <Link href={`/admin/customers/${customer.id}`} className="font-medium text-ink hover:text-gold">
        {customer.name}
      </Link>
    ),
  },
  { header: "Email", cell: (customer) => customer.email },
  { header: "Orders", cell: (customer) => customer.orders_count },
  {
    header: "Total spent",
    card: "badge",
    cell: (customer) => <span className="font-medium text-ink">{formatPence(customer.total_spent_pence)}</span>,
  },
  { header: "Joined", cell: (customer) => formatDate(customer.created_at) },
];

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data } = useSWR<PaginatedResponse<Customer>>(
    `/api/admin/customers${buildQuery({ search, page, per_page: 20 })}`,
    swrFetcher,
    { keepPreviousData: true },
  );

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadCustomers(search);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "The export could not be created.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Customers</h1>
          <p className="mt-1 text-sm text-ink-soft">Everyone with an account — order history, addresses, and a way to reach them.</p>
        </div>
        <Button variant="outline" onClick={handleExport} loading={exporting}>
          Export CSV
        </Button>
      </div>
      {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}

      <div className="mt-4 max-w-sm">
        <Input
          type="search"
          aria-label="Search customers"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-6">
        {data ? (
          <ResponsiveTable rows={data.data} columns={COLUMNS} getKey={(customer) => customer.id} empty="No customers found." />
        ) : (
          <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>

      {data && <PaginationControls page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />}
    </div>
  );
}
