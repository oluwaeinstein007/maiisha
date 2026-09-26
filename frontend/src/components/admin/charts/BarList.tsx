"use client";

import { useState } from "react";
import clsx from "clsx";

export interface BarRow {
  key: string;
  label: string;
  /** What the bar length encodes. */
  value: number;
  /** The value as shown at the tip of the bar. */
  valueLabel: string;
  /** Extra line for the hover/focus tooltip ("12 units"). */
  detail?: string;
  /** Rendered in the de-emphasis grey instead of the accent (e.g. unpaid orders). */
  muted?: boolean;
}

/**
 * Horizontal bars for nominal categories: one colour (they're one series, so the
 * length alone carries the value), value at the tip, name in ink — never coloured.
 * Each row is its own hover/focus target.
 */
export function BarList({ rows, emptyLabel = "Nothing to show for this period." }: { rows: BarRow[]; emptyLabel?: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => r.value), 0);

  if (rows.length === 0) return <p className="py-6 text-center text-sm text-[var(--viz-ink-3)]">{emptyLabel}</p>;

  return (
    <ul className="space-y-0.5">
      {rows.map((row) => {
        const ratio = max > 0 ? row.value / max : 0;
        const isHovered = hovered === row.key;

        return (
          <li
            key={row.key}
            tabIndex={0}
            aria-label={`${row.label}: ${row.valueLabel}${row.detail ? `, ${row.detail}` : ""}`}
            onPointerEnter={() => setHovered(row.key)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(row.key)}
            onBlur={() => setHovered(null)}
            className="relative rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--viz-accent)]"
          >
            <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-3 py-1.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
              <span className="truncate text-sm text-[var(--viz-ink-2)]">{row.label}</span>
              <div className="flex min-w-0 items-center gap-2">
                {/* ≤24px thick, 4px-rounded at the data end, square at the baseline. A zero has no bar
                    at all — the 2px floor is only so a tiny non-zero value stays visible. */}
                {row.value > 0 && (
                  <div
                    className={clsx(
                      "h-5 shrink-0 rounded-r-[4px] transition-opacity",
                      row.muted ? "bg-[var(--viz-context)]" : "bg-[var(--viz-accent)]",
                      isHovered && "opacity-75",
                    )}
                    style={{ width: `max(2px, calc((100% - 6.5rem) * ${ratio}))` }}
                  />
                )}
                <span className="shrink-0 text-sm font-semibold text-[var(--viz-ink)]">{row.valueLabel}</span>
              </div>
            </div>

            {isHovered && row.detail && (
              <div
                role="presentation"
                className="pointer-events-none absolute right-0 top-full z-10 mt-0.5 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs shadow-lg"
              >
                <span className="font-semibold text-[var(--viz-ink)]">{row.valueLabel}</span>{" "}
                <span className="text-[var(--viz-ink-2)]">
                  {row.label} · {row.detail}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
