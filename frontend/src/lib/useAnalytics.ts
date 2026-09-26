import useSWR from "swr";
import { buildQuery, swrFetcher } from "@/lib/api";
import { formatDayMonth } from "@/lib/money";
import type { AdminAnalytics, AnalyticsRange } from "@/lib/types";

export interface RangeSelection {
  range: AnalyticsRange;
  /** YYYY-MM-DD, custom range only. */
  from?: string;
  to?: string;
}

export const RANGE_PRESETS: Array<{ key: AnalyticsRange; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
  { key: "ytd", label: "Year to date" },
];

export function analyticsQuery(selection: RangeSelection): string {
  const custom = selection.range === "custom";
  return buildQuery({
    range: selection.range,
    from: custom ? selection.from : undefined,
    to: custom ? selection.to : undefined,
  });
}

/**
 * Analytics for a range. Keeps showing the previous result while the next
 * loads (SWR keepPreviousData) so changing the range never blanks the page;
 * `isRefreshing` lets the UI dim it instead.
 */
export function useAnalytics(selection: RangeSelection) {
  const ready = selection.range !== "custom" || (!!selection.from && !!selection.to);
  const { data, error, isLoading, isValidating } = useSWR<AdminAnalytics>(
    ready ? `/api/admin/analytics${analyticsQuery(selection)}` : null,
    swrFetcher,
    { keepPreviousData: true, refreshInterval: 60_000 },
  );

  return { data, error, isLoading, isRefreshing: isValidating && !!data };
}

/** "vs previous 30 days" — deltas are always stated against a named period. */
export function comparisonLabel(range: AdminAnalytics["range"]): string {
  return `vs previous ${range.days} ${range.days === 1 ? "day" : "days"}`;
}

/** "22 May – 20 Jun 2026" */
export function describeRange(range: AdminAnalytics["range"]): string {
  const year = range.to.slice(0, 4);
  const sameYear = range.from.slice(0, 4) === year;
  return `${formatDayMonth(range.from)}${sameYear ? "" : ` ${range.from.slice(0, 4)}`} – ${formatDayMonth(range.to)} ${year}`;
}
