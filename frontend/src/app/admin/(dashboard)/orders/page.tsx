"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { swrFetcher, buildQuery } from "@/lib/api";
import { formatDateTime, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import type { OrderStatus, PaginatedResponse, Order } from "@/lib/types";

const STATUS_FILTERS: Array<OrderStatus | "all"> = [
  "all",
  "pending_payment",
  "placed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data } = useSWR<PaginatedResponse<Order>>(
    `/api/admin/orders${buildQuery({ status: status === "all" ? undefined : status, page, per_page: 20 })}`,
    swrFetcher,
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
              status === s ? "bg-ink text-cream" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft/60">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {data?.data.map((order) => (
              <tr key={order.id} className="hover:bg-ink/5">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-ink hover:text-gold"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{order.customer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{formatDateTime(order.created_at)}</td>
                <td className="px-4 py-3 text-ink-soft">{formatPence(order.total_pence)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ORDER_STATUS_STYLES[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.data.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-soft">No orders found.</p>
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
