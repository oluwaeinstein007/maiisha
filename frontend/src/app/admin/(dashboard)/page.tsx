"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, BadgePercent, ChevronRight } from "lucide-react";
import { apiResource, swrFetcher } from "@/lib/api";
import { formatDateTime, formatPence, formatPenceCompact } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import { describeSchedule } from "@/lib/sale";
import { comparisonLabel, describeRange, useAnalytics, type RangeSelection } from "@/lib/useAnalytics";
import type { AdminDashboard, Sale } from "@/lib/types";
import { RangeFilter } from "@/components/admin/analytics/RangeFilter";
import { RevenueCard } from "@/components/admin/analytics/RevenueCard";
import { StatTile } from "@/components/admin/charts/StatTile";
import { QuickRestock } from "@/components/admin/QuickRestock";

const RESTOCK_PREVIEW = 6;

function AttentionCard({
  label,
  count,
  hint,
  href,
}: {
  label: string;
  count: number;
  hint: string;
  href: string;
}) {
  const needsAttention = count > 0;

  return (
    <Link
      href={href}
      className="group flex min-h-20 items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4 transition-colors hover:border-gold sm:p-5"
    >
      <div className="min-w-0">
        <p className="text-xs text-ink-soft">{label}</p>
        <p className="mt-1 text-xs text-ink-soft/70">{hint}</p>
      </div>
      <p
        className={clsx(
          "font-sans text-3xl font-semibold leading-none",
          needsAttention ? "text-amber-700" : "text-ink/30",
        )}
      >
        {count}
      </p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [selection, setSelection] = useState<RangeSelection>({ range: "30d" });
  const { data: analytics, isRefreshing } = useAnalytics(selection);
  const { data: ops, mutate: mutateOps } = useSWR<AdminDashboard>("/api/admin/dashboard", swrFetcher, { refreshInterval: 60_000 });
  const { data: sales } = useSWR<Sale[]>("/api/admin/sales", () => apiResource.get<Sale[]>("/api/admin/sales"));

  // Sold-out first: they cost sales now and shoppers may be waiting on them.
  const restockRows = ops ? [...ops.out_of_stock, ...ops.low_stock].slice(0, RESTOCK_PREVIEW) : [];
  const restockTotal = ops ? ops.out_of_stock_count + ops.low_stock_count : 0;
  const liveSales = sales?.filter((sale) => sale.status === "live") ?? [];
  const kpis = analytics?.kpis;
  const comparison = analytics ? comparisonLabel(analytics.range) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h1 className="font-display text-2xl text-ink">Dashboard</h1>
          {analytics && <p className="mt-1 text-sm text-ink-soft">{describeRange(analytics.range)}</p>}
        </div>
        <Link href="/admin/analytics" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-soft hover:text-gold">
          Full analytics <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <RangeFilter value={selection} onChange={setSelection} />

      {!analytics && <p className="py-6 text-sm text-ink-soft">Loading…</p>}

      {analytics && kpis && (
        <div className={clsx("space-y-6 transition-opacity duration-200", isRefreshing && "opacity-60")} aria-busy={isRefreshing}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              hero
              className="sm:col-span-2"
              label="Revenue"
              value={formatPenceCompact(kpis.revenue_pence.current)}
              change={kpis.revenue_pence.change_percent}
              comparison={comparison}
              trend={analytics.timeseries.map((p) => p.revenue_pence)}
              footnote="Paid orders, including VAT and shipping"
            />
            <StatTile
              label="Orders"
              value={String(kpis.orders.current)}
              change={kpis.orders.change_percent}
              comparison={comparison}
              trend={analytics.timeseries.map((p) => p.orders)}
            />
            <StatTile
              label="Average order value"
              value={formatPenceCompact(kpis.average_order_value_pence.current)}
              change={kpis.average_order_value_pence.change_percent}
              comparison={comparison}
            />
          </div>

          <RevenueCard data={analytics} busy={isRefreshing} />
        </div>
      )}

      {ops && (
        <div className="grid gap-4 sm:grid-cols-3">
          <AttentionCard
            label="Awaiting payment"
            count={ops.pending_payment_count}
            hint="Checkouts started, not paid"
            href="/admin/orders"
          />
          <AttentionCard
            label="Out of stock"
            count={ops.out_of_stock_count}
            hint="Variants with nothing left"
            href="/admin/inventory?status=out"
          />
          <AttentionCard
            label="Running low"
            count={ops.low_stock_count}
            hint="At or under their threshold"
            href="/admin/inventory?status=low"
          />
        </div>
      )}

      {sales && (
        <section className="rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <BadgePercent size={18} className="text-gold-deep" aria-hidden="true" />
              Sales running now
            </h2>
            <Link href="/admin/sales" className="inline-flex min-h-10 items-center text-sm text-ink-soft hover:text-gold">
              Manage sales
            </Link>
          </div>
          {liveSales.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              Nothing is on sale right now.{" "}
              <Link href="/admin/sales/new" className="text-ink underline hover:text-gold">
                Create a sale
              </Link>
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-ink/10">
              {liveSales.map((sale) => (
                <li key={sale.id}>
                  <Link
                    href={`/admin/sales/${sale.id}`}
                    className="-mx-4 flex items-baseline justify-between gap-4 px-4 py-3 transition-colors hover:bg-ink/5 sm:-mx-5 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{sale.name}</p>
                      <p className="truncate text-xs text-ink-soft">{describeSchedule(sale)}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{sale.discount_label}</span>
                      <ChevronRight size={16} className="text-ink-soft/50" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {ops && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">Recent orders</h2>
              <Link href="/admin/orders" className="inline-flex min-h-10 items-center text-sm text-ink-soft hover:text-gold">
                View all
              </Link>
            </div>
            {ops.recent_orders.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No orders yet.</p>
            ) : (
              <ul className="mt-1 divide-y divide-ink/10">
                {ops.recent_orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="-mx-4 flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-ink/5 sm:-mx-5 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{order.order_number}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {order.customer} · {formatDateTime(order.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ORDER_STATUS_STYLES[order.status]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          <span className="text-sm text-ink">{formatPence(order.total_pence)}</span>
                        </div>
                        <ChevronRight size={16} className="text-ink-soft/50" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div id="restock" className="min-w-0 scroll-mt-20 rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" aria-hidden="true" />
              <h2 className="font-display text-lg text-ink">Needs restocking</h2>
            </div>
            {restockRows.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Everything is well stocked.</p>
            ) : (
              <QuickRestock rows={restockRows} onChanged={() => mutateOps()} />
            )}
            {restockTotal > restockRows.length && (
              <Link
                href="/admin/inventory"
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-soft hover:text-gold"
              >
                See all {restockTotal} in Inventory <ArrowRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
