"use client";

import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle } from "lucide-react";
import { swrFetcher } from "@/lib/api";
import { formatDateTime, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import type { AdminDashboard } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-ink-soft/60">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data } = useSWR<AdminDashboard>("/api/admin/dashboard", swrFetcher, {
    refreshInterval: 60_000,
  });

  if (!data) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-ink">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders" value={String(data.orders_count)} />
        <StatCard label="Revenue" value={formatPence(data.revenue_pence)} />
        <StatCard label="Pending payment" value={String(data.pending_payment_count)} />
        <StatCard label="Out of stock" value={String(data.out_of_stock_count)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-ink-soft hover:text-gold">
              View all
            </Link>
          </div>
          {data.recent_orders.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">No orders yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {data.recent_orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-sm font-medium text-ink hover:text-gold"
                    >
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {order.customer} · {formatDateTime(order.created_at)}
                    </p>
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
        </div>

        <div className="rounded-xl border border-ink/10 bg-white p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="font-display text-lg text-ink">Low stock</h2>
          </div>
          {data.low_stock.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Nothing running low right now.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {data.low_stock.map((item) => (
                <li key={item.variant_id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{item.product_name}</p>
                    <p className="text-xs text-ink-soft">{item.sku}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                    {item.stock_quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
