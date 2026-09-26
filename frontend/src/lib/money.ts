const formatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatPence(pence: number): string {
  return formatter.format(pence / 100);
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

/**
 * Money for stat tiles and axes: whole pounds under £10k ("£1,141"), then
 * compact ("£12.9K", "£4.2M"). Pence only where they matter (small figures).
 */
export function formatPenceCompact(pence: number): string {
  const pounds = pence / 100;
  const abs = Math.abs(pounds);

  if (abs >= 1_000_000) return `£${(pounds / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 10_000) return `£${(pounds / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  if (abs >= 100) return formatter.format(Math.round(pounds)).replace(/\.00$/, "");
  return formatter.format(pounds);
}

/** Axis tick: "£0", "£500", "£1.5k" — no pence, as short as possible. */
export function formatAxisPounds(pence: number): string {
  const pounds = pence / 100;
  if (pounds >= 1000) return `£${(pounds / 1000).toFixed(pounds % 1000 === 0 ? 0 : 1)}k`;
  return `£${Math.round(pounds)}`;
}

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const monthYearFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });
const weekdayLongFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "16 Jun" — from a plain "YYYY-MM-DD" date, read as a calendar day (no timezone shift). */
export function formatDayMonth(isoDate: string): string {
  return dayMonthFormatter.format(new Date(`${isoDate}T12:00:00`));
}

export function formatMonthYear(isoDate: string): string {
  return monthYearFormatter.format(new Date(`${isoDate}T12:00:00`));
}

/** "Tue 16 Jun" */
export function formatWeekdayDate(isoDate: string): string {
  return weekdayLongFormatter.format(new Date(`${isoDate}T12:00:00`));
}

/**
 * "Just now", "5m ago", "3h ago", "2d ago" — for the notification bell, where a
 * scannable feed matters more than the exact minute. Falls back to a plain date
 * once something is more than a week old, so "40d ago" doesn't linger.
 */
export function formatRelativeTime(iso: string): string {
  const diffSeconds = Math.abs(Math.round((Date.now() - new Date(iso).getTime()) / 1000));

  if (diffSeconds < 45) return "Just now";
  if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86_400) return `${Math.round(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 7 * 86_400) return `${Math.round(diffSeconds / 86_400)}d ago`;
  return formatDate(iso);
}
