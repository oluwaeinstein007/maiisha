import { formatDayMonth } from "./money";

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** [1] → "Mondays", [1, 5] → "Mondays & Fridays", [5, 6, 7] → "Fri–Sun". Null when it runs every day. */
export function describeWeekdays(days: number[] | null | undefined): string | null {
  if (!days || days.length === 0 || days.length === 7) return null;
  const sorted = [...days].sort((a, b) => a - b);

  const consecutive = sorted.length >= 3 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive) {
    return `${WEEKDAY_SHORT[sorted[0] - 1]}–${WEEKDAY_SHORT[sorted[sorted.length - 1] - 1]}`;
  }

  const names = sorted.map((d) => `${WEEKDAY_LONG[d - 1]}s`);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** "Ends 26 Dec" from an ISO instant, in the shop's timezone (UK). Null for an open-ended sale. */
export function formatSaleEnds(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(endsAt));
  return `Ends ${formatDayMonth(day)}`;
}

/** Percentage saved, rounded — for the "-20%" badge when only the two prices are known. */
export function savingPercent(original: number, price: number): number {
  return original > 0 ? Math.round(((original - price) / original) * 100) : 0;
}

/** "2026-12-01T00:00" → "1 Dec 2026" (the calendar date only, read as written). */
function localDate(local: string): string {
  const date = new Date(`${local.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Times are only worth showing when they aren't the defaults (start of day / end of day). */
function localTime(local: string, defaultTime: string): string {
  const time = local.slice(11, 16);
  return time === defaultTime ? "" : ` at ${time}`;
}

/** "Manual — live while switched on", "Mondays only · No end date", "1 Dec 2026 – 26 Dec 2026"… for the admin lists. */
export function describeSchedule(sale: {
  starts_at_local: string | null;
  ends_at_local: string | null;
  active_weekdays: number[] | null;
}): string {
  const parts: string[] = [];
  const weekdays = describeWeekdays(sale.active_weekdays);
  if (weekdays) parts.push(`${weekdays} only`);

  const { starts_at_local: start, ends_at_local: end } = sale;
  if (start && end) {
    parts.push(`${localDate(start)}${localTime(start, "00:00")} – ${localDate(end)}${localTime(end, "23:59")}`);
  } else if (start) {
    parts.push(`From ${localDate(start)}${localTime(start, "00:00")}`);
  } else if (end) {
    parts.push(`Until ${localDate(end)}${localTime(end, "23:59")}`);
  } else if (weekdays) {
    parts.push("No end date");
  } else {
    parts.push("Manual — live while switched on");
  }

  return parts.join(" · ");
}
