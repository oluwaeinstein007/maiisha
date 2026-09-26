"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { API_URL } from "@/lib/api";
import { formatPence, formatPenceCompact } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { WEEKDAY_LONG } from "@/lib/sale";
import { analyticsQuery, comparisonLabel, describeRange, useAnalytics, type RangeSelection } from "@/lib/useAnalytics";
import type { AdminAnalytics } from "@/lib/types";
import { RangeFilter } from "@/components/admin/analytics/RangeFilter";
import { RevenueCard } from "@/components/admin/analytics/RevenueCard";
import { BarList } from "@/components/admin/charts/BarList";
import { ChartCard, DataTable } from "@/components/admin/charts/ChartCard";
import { ColumnChart } from "@/components/admin/charts/ColumnChart";
import { StatTile } from "@/components/admin/charts/StatTile";

const STATUS_DETAIL: Partial<Record<string, string>> = {
  pending_payment: "Checkout started but not paid",
  cancelled: "Cancelled or refunded",
};

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="viz min-w-0 rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-[var(--viz-ink-3)]">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Where the money went: list price → what sales and codes took off → what was paid. */
function MoneyBreakdown({ money }: { money: AdminAnalytics["money"] }) {
  const rows: Array<{ label: string; value: string; strong?: boolean; muted?: boolean }> = [
    { label: "Items at list price", value: formatPence(money.list_price_pence) },
    { label: "Sale savings", value: `−${formatPence(money.sale_savings_pence)}` },
    { label: "Discount codes", value: `−${formatPence(money.code_discounts_pence)}` },
    { label: "Shipping charged", value: formatPence(money.shipping_pence) },
    { label: "Total paid", value: formatPence(money.total_pence), strong: true },
    { label: "of which VAT", value: formatPence(money.vat_pence), muted: true },
  ];

  return (
    <dl className="text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className={clsx(
            "flex items-baseline justify-between gap-4 py-2",
            row.strong && "mt-1 border-t border-ink/15 pt-3 font-semibold",
            row.muted && "text-[var(--viz-ink-3)]",
          )}
        >
          <dt className={clsx(!row.strong && !row.muted && "text-[var(--viz-ink-2)]")}>{row.label}</dt>
          <dd className="tabular-nums text-[var(--viz-ink)]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function downloadOrders(selection: RangeSelection, range: AdminAnalytics["range"]) {
  const response = await fetch(`${API_URL}/api/admin/analytics/export${analyticsQuery(selection)}`, {
    credentials: "include",
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) throw new Error("The export could not be created.");

  // Named from the range rather than the response header: that header isn't readable cross-origin (dev).
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `maiisha-orders-${range.from}-to-${range.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalyticsPage() {
  const [selection, setSelection] = useState<RangeSelection>({ range: "30d" });
  const { data, error, isLoading, isRefreshing } = useAnalytics(selection);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    setExportError(null);
    try {
      await downloadOrders(selection, data.range);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "The export could not be created.");
    } finally {
      setExporting(false);
    }
  };

  const kpis = data?.kpis;
  const comparison = data ? comparisonLabel(data.range) : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Analytics</h1>
        {data && (
          <p className="mt-1 text-sm text-ink-soft">
            {describeRange(data.range)} · {data.range.days} {data.range.days === 1 ? "day" : "days"} · UK time
          </p>
        )}
      </div>

      <RangeFilter value={selection} onChange={setSelection} onExport={handleExport} exporting={exporting} />
      {exportError && (
        <p role="alert" className="text-sm text-red-600">
          {exportError}
        </p>
      )}

      {isLoading && !data && <p className="py-10 text-sm text-ink-soft">Loading analytics…</p>}
      {error && !data && (
        <p role="alert" className="py-10 text-sm text-red-600">
          Could not load analytics. Please try again.
        </p>
      )}

      {data && kpis && (
        // Refetching keeps the frame: the previous numbers stay put, dimmed, until the new ones land.
        <div className={clsx("space-y-6 transition-opacity duration-200", isRefreshing && "opacity-60")} aria-busy={isRefreshing}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              hero
              className="sm:col-span-2"
              label="Revenue"
              value={formatPenceCompact(kpis.revenue_pence.current)}
              change={kpis.revenue_pence.change_percent}
              comparison={comparison}
              trend={data.timeseries.map((p) => p.revenue_pence)}
              footnote="Paid orders, including VAT and shipping"
            />
            <StatTile
              label="Orders"
              value={String(kpis.orders.current)}
              change={kpis.orders.change_percent}
              comparison={comparison}
              trend={data.timeseries.map((p) => p.orders)}
            />
            <StatTile
              label="Average order value"
              value={formatPenceCompact(kpis.average_order_value_pence.current)}
              change={kpis.average_order_value_pence.change_percent}
              comparison={comparison}
            />
            <StatTile
              label="Units sold"
              value={String(kpis.units_sold.current)}
              change={kpis.units_sold.change_percent}
              comparison={comparison}
            />
            <StatTile
              label="New customers"
              value={String(kpis.new_customers.current)}
              change={kpis.new_customers.change_percent}
              comparison={comparison}
              footnote={`${data.customers.returning} returning`}
            />
            <StatTile
              label="Sign-ups"
              value={String(kpis.signups.current)}
              change={kpis.signups.change_percent}
              comparison={comparison}
            />
            <StatTile
              label="Given away in sales"
              value={formatPenceCompact(data.money.sale_savings_pence)}
              footnote="Off list price, this period"
            />
          </div>

          <RevenueCard data={data} busy={isRefreshing} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Top products"
              subtitle="By revenue"
              table={
                <DataTable
                  columns={[{ label: "Product" }, { label: "Units", numeric: true }, { label: "Revenue", numeric: true }]}
                  rows={data.top_products.map((p) => [p.name, p.units, formatPence(p.revenue_pence)])}
                />
              }
            >
              <BarList
                rows={data.top_products.map((p) => ({
                  key: p.name,
                  label: p.name,
                  value: p.revenue_pence,
                  valueLabel: formatPenceCompact(p.revenue_pence),
                  detail: `${p.units} ${p.units === 1 ? "unit" : "units"}`,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Revenue by category"
              subtitle="Subcategories roll up into their parent"
              table={
                <DataTable
                  columns={[{ label: "Category" }, { label: "Units", numeric: true }, { label: "Revenue", numeric: true }]}
                  rows={data.categories.map((c) => [c.name, c.units, formatPence(c.revenue_pence)])}
                />
              }
            >
              <BarList
                rows={data.categories.map((c) => ({
                  key: c.name,
                  label: c.name,
                  value: c.revenue_pence,
                  valueLabel: formatPenceCompact(c.revenue_pence),
                  detail: `${c.units} ${c.units === 1 ? "unit" : "units"}`,
                }))}
              />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Best days of the week"
              subtitle="Revenue by day, UK time — is your Monday deal pulling its weight?"
              table={
                <DataTable
                  columns={[{ label: "Day" }, { label: "Orders", numeric: true }, { label: "Revenue", numeric: true }]}
                  rows={data.weekdays.map((d) => [WEEKDAY_LONG[d.weekday - 1], d.orders, formatPence(d.revenue_pence)])}
                />
              }
            >
              <ColumnChart data={data.weekdays} />
            </ChartCard>

            <ChartCard
              title="Orders by status"
              subtitle="Everything placed in the period — grey rows aren't sales"
              table={
                <DataTable
                  columns={[{ label: "Status" }, { label: "Orders", numeric: true }]}
                  rows={data.statuses.map((s) => [ORDER_STATUS_LABELS[s.status], s.count])}
                />
              }
            >
              <BarList
                rows={data.statuses.map((s) => ({
                  key: s.status,
                  label: ORDER_STATUS_LABELS[s.status],
                  value: s.count,
                  valueLabel: String(s.count),
                  detail: STATUS_DETAIL[s.status],
                  muted: s.status === "pending_payment" || s.status === "cancelled",
                }))}
              />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Where the money went" subtitle="List price down to what customers paid">
              <MoneyBreakdown money={data.money} />
            </Card>

            <div className="min-w-0 space-y-6">
              <Card title="Sale performance" subtitle="What each sale earned and what it cost">
                <div className="overflow-x-auto">
                  <DataTable
                    empty="No orders were placed on sale in this period."
                    columns={[
                      { label: "Sale" },
                      { label: "Orders", numeric: true },
                      { label: "Revenue", numeric: true },
                      { label: "Saved", numeric: true },
                    ]}
                    rows={data.sales.map((s) => [s.name, s.orders, formatPence(s.revenue_pence), formatPence(s.savings_pence)])}
                  />
                </div>
              </Card>

              <Card title="Discount codes" subtitle="Codes used at checkout">
                <div className="overflow-x-auto">
                  <DataTable
                    empty="No discount codes were used in this period."
                    columns={[
                      { label: "Code" },
                      { label: "Uses", numeric: true },
                      { label: "Discount", numeric: true },
                      { label: "Revenue", numeric: true },
                    ]}
                    rows={data.discount_codes.map((c) => [
                      c.code,
                      c.uses,
                      formatPence(c.discount_pence),
                      formatPence(c.revenue_pence),
                    ])}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
