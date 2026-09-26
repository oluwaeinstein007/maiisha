"use client";

import { formatPence } from "@/lib/money";
import { formatDayMonth, formatMonthYear } from "@/lib/money";
import type { AdminAnalytics } from "@/lib/types";
import { ChartCard, DataTable } from "@/components/admin/charts/ChartCard";
import { RevenueChart } from "@/components/admin/charts/RevenueChart";

function bucketName(date: string, granularity: AdminAnalytics["range"]["granularity"]): string {
  if (granularity === "month") return formatMonthYear(date);
  return granularity === "week" ? `Week of ${formatDayMonth(date)}` : formatDayMonth(date);
}

/** Revenue over time against the previous period, with its table twin. */
export function RevenueCard({ data, busy }: { data: AdminAnalytics; busy?: boolean }) {
  const { timeseries, range } = data;
  const hasPrevious = timeseries.some((p) => (p.previous_revenue_pence ?? 0) > 0);
  const empty = timeseries.every((p) => p.revenue_pence === 0) && !hasPrevious;
  const unit = range.granularity === "day" ? "day" : range.granularity === "week" ? "week" : "month";

  return (
    <ChartCard
      title="Revenue"
      subtitle={`Paid orders, by ${unit}`}
      busy={busy}
      legend={
        hasPrevious ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-4 rounded bg-[var(--viz-accent)]" />
              This period
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-4 rounded bg-[var(--viz-context)]" />
              Previous period
            </span>
          </>
        ) : undefined
      }
      table={
        <DataTable
          columns={[
            { label: unit === "day" ? "Day" : unit === "week" ? "Week" : "Month" },
            { label: "Revenue", numeric: true },
            { label: "Orders", numeric: true },
            ...(hasPrevious ? [{ label: "Previous period", numeric: true }] : []),
          ]}
          rows={timeseries.map((p) => [
            bucketName(p.date, range.granularity),
            formatPence(p.revenue_pence),
            p.orders,
            ...(hasPrevious ? [p.previous_revenue_pence === null ? "—" : formatPence(p.previous_revenue_pence)] : []),
          ])}
        />
      }
    >
      {empty ? (
        <p className="py-16 text-center text-sm text-[var(--viz-ink-3)]">No paid orders in this period yet.</p>
      ) : (
        <RevenueChart data={timeseries} granularity={range.granularity} hasPrevious={hasPrevious} />
      )}
    </ChartCard>
  );
}
