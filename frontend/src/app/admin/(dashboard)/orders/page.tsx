"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { Eye } from "lucide-react";
import { swrFetcher, buildQuery } from "@/lib/api";
import { formatDateTime, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import type { OrderStatus, PaginatedResponse, Order } from "@/lib/types";
import { IconAction } from "@/components/admin/IconAction";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { ResponsiveTable, type TableColumn } from "@/components/admin/ResponsiveTable";
import { Input } from "@/components/ui/Field";

const STATUS_FILTERS: Array<OrderStatus | "all"> = [
  "all",
  "pending_payment",
  "placed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

function isOrderStatus(value: string | null): value is OrderStatus {
  return !!value && (STATUS_FILTERS as string[]).includes(value) && value !== "all";
}

const COLUMNS: TableColumn<Order>[] = [
  {
    header: "Order",
    card: "title",
    cell: (order) => (
      <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink hover:text-gold">
        {order.order_number}
      </Link>
    ),
  },
  { header: "Customer", cell: (order) => order.customer?.name ?? "—" },
  { header: "Date", cell: (order) => formatDateTime(order.created_at) },
  { header: "Total", cell: (order) => formatPence(order.total_pence) },
  {
    header: "Status",
    card: "badge",
    cell: (order) => (
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${ORDER_STATUS_STYLES[order.status]}`}
      >
        {ORDER_STATUS_LABELS[order.status]}
      </span>
    ),
  },
  {
    header: "",
    card: "actions",
    cell: (order) => (
      <div className="flex justify-end">
        <IconAction label={`View ${order.order_number}`} href={`/admin/orders/${order.id}`}>
          <Eye size={15} />
        </IconAction>
      </div>
    ),
  },
];

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">Loading…</p>}>
      <AdminOrdersPageContent />
    </Suspense>
  );
}

function AdminOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Honours a deep link like /admin/orders?status=pending_payment (the
  // notification bell's "payment never completed" items send admins here).
  const [status, setStatus] = useState<OrderStatus | "all">(
    isOrderStatus(searchParams.get("status")) ? (searchParams.get("status") as OrderStatus) : "all",
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data } = useSWR<PaginatedResponse<Order>>(
    `/api/admin/orders${buildQuery({ status: status === "all" ? undefined : status, search, page, per_page: 20 })}`,
    swrFetcher,
    { keepPreviousData: true },
  );

  const changeStatus = (next: OrderStatus | "all") => {
    setStatus(next);
    setPage(1);
    router.replace(next === "all" ? "/admin/orders" : `/admin/orders?status=${next}`, { scroll: false });
  };

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Orders</h1>

      <div
        className="scrollbar-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Filter by status"
      >
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => changeStatus(s)}
            className={clsx(
              "inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors",
              status === s ? "bg-ink text-cream" : "bg-ink/5 text-ink-soft hover:bg-ink/10",
            )}
          >
            {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-sm">
        <Input
          type="search"
          aria-label="Search orders"
          placeholder="Search by order number, customer name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-6">
        {data ? (
          <ResponsiveTable rows={data.data} columns={COLUMNS} getKey={(order) => order.id} empty="No orders found." />
        ) : (
          <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>

      {data && <PaginationControls page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />}
    </div>
  );
}
