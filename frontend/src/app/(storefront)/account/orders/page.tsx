"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { swrFetcher, buildQuery } from "@/lib/api";
import { formatDate, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import type { Order, PaginatedResponse } from "@/lib/types";

export default function OrdersListPage() {
  const [page, setPage] = useState(1);
  const { data: orders } = useSWR<PaginatedResponse<Order>>(
    `/api/orders${buildQuery({ page })}`,
    swrFetcher,
  );

  return (
    <div>
      <h2 className="font-display text-lg text-ink">Order history</h2>

      {!orders ? (
        <p className="mt-4 text-sm text-ink-soft">Loading…</p>
      ) : orders.data.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">You haven&apos;t placed any orders yet.</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-ink/10 rounded-xl border border-ink/10">
            {orders.data.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-ink/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{order.order_number}</p>
                    <p className="text-xs text-ink-soft">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ORDER_STATUS_STYLES[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-sm text-ink">{formatPence(order.total_pence)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {orders.meta.last_page > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: orders.meta.last_page }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={
                    p === orders.meta.current_page
                      ? "flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm text-cream"
                      : "flex h-9 w-9 items-center justify-center rounded-full text-sm text-ink-soft hover:bg-ink/5"
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
