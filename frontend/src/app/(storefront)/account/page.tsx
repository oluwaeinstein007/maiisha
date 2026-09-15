"use client";

import Link from "next/link";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatDate, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import type { Order, PaginatedResponse } from "@/lib/types";

export default function AccountOverviewPage() {
  const { data: orders } = useSWR<PaginatedResponse<Order>>("/api/orders?per_page=3", swrFetcher);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-ink/10 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Recent orders</h2>
          <Link href="/account/orders" className="text-sm text-ink-soft hover:text-gold">
            View all
          </Link>
        </div>

        {!orders ? (
          <p className="mt-4 text-sm text-ink-soft">Loading…</p>
        ) : orders.data.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            No orders yet.{" "}
            <Link href="/search" className="underline hover:text-gold">
              Start shopping
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10">
            {orders.data.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="text-sm font-medium text-ink hover:text-gold"
                  >
                    {order.order_number}
                  </Link>
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/addresses"
          className="rounded-xl border border-ink/10 p-6 hover:border-gold"
        >
          <h3 className="font-display text-lg text-ink">Addresses</h3>
          <p className="mt-1 text-sm text-ink-soft">Manage your saved delivery addresses.</p>
        </Link>
        <Link href="/search" className="rounded-xl border border-ink/10 p-6 hover:border-gold">
          <h3 className="font-display text-lg text-ink">Continue shopping</h3>
          <p className="mt-1 text-sm text-ink-soft">Browse the full MAI_ISHA catalogue.</p>
        </Link>
      </section>
    </div>
  );
}
