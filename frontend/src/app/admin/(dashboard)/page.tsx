"use client";

import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { swrFetcher } from "@/lib/api";
import { formatDate, formatDateTime, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import type { AdminDashboard } from "@/lib/types";

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: { positive: boolean; label: string } | null;
}) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-ink-soft/60">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-2xl text-ink">{value}</p>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend.positive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}

const CHART_HEIGHT_PX = 120;

function DailyRevenueChart({ data }: { data: AdminDashboard["daily_revenue"] }) {
  if (data.length === 0) {
    return null;
  }

  const max = Math.max(...data.map((d) => d.revenue_pence), 1);

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <h2 className="font-display text-lg text-ink">Revenue, last {data.length} days</h2>
      {data.every((d) => d.revenue_pence === 0) ? (
        <p className="mt-4 text-sm text-ink-soft">No revenue in this window yet.</p>
      ) : (
        <div className="mt-6 flex items-end gap-1.5" style={{ height: CHART_HEIGHT_PX }}>
          {data.map((day) => (
            <div
              key={day.date}
              className="group relative flex-1"
              title={`${formatDate(day.date)}: ${formatPence(day.revenue_pence)}`}
            >
              <div
                className="w-full rounded-t bg-gold/70 transition-colors group-hover:bg-gold"
                style={{
                  height: day.revenue_pence > 0
                    ? Math.max((day.revenue_pence / max) * CHART_HEIGHT_PX, 4)
                    : 1,
                }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-between text-[11px] text-ink-soft/60">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
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
        <StatCard
          label="Revenue"
          value={formatPence(data.revenue_pence)}
          trend={
            data.revenue_growth_percent === null
              ? null
              : {
                  positive: data.revenue_growth_percent >= 0,
                  label: `${data.revenue_growth_percent >= 0 ? "+" : ""}${data.revenue_growth_percent}% vs last month`,
                }
          }
        />
        <StatCard label="Orders" value={String(data.orders_count)} />
        <StatCard label="Pending payment" value={String(data.pending_payment_count)} />
        <StatCard label="Out of stock" value={String(data.out_of_stock_count)} />
      </div>

      <DailyRevenueChart data={data.daily_revenue} />

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
