"use client";

import { useState } from "react";
import { formatAxisPounds, formatPence } from "@/lib/money";
import { niceAxis } from "@/lib/chartScale";
import { useElementWidth } from "@/lib/useElementWidth";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/sale";
import type { AdminAnalytics } from "@/lib/types";

const HEIGHT = 200;
const MARGIN = { top: 22, right: 8, bottom: 26, left: 48 };

/** Takings by day of the week. One colour; only the busiest day is labelled, the rest read from the axis and tooltip. */
export function ColumnChart({ data }: { data: AdminAnalytics["weekdays"] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const axis = niceAxis(Math.max(0, ...data.map((d) => d.revenue_pence)), 3);
  const slot = plotWidth / data.length;
  const barWidth = Math.min(24, slot * 0.55);
  const y = (value: number) => MARGIN.top + plotHeight - (value / axis.max) * plotHeight;

  const peakValue = Math.max(...data.map((d) => d.revenue_pence));
  const peakIndex = peakValue > 0 ? data.findIndex((d) => d.revenue_pence === peakValue) : -1;

  return (
    <div ref={ref} className="relative" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="group" aria-label="Revenue by day of the week" className="block overflow-visible">
          {axis.ticks.map((tick) => (
            <g key={tick} aria-hidden="true">
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                strokeWidth={1}
                className={tick === 0 ? "stroke-[var(--viz-axis)]" : "stroke-[var(--viz-grid)]"}
              />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-[var(--viz-ink-3)] text-[11px] tabular-nums">
                {formatAxisPounds(tick)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = MARGIN.left + slot * i + slot / 2;
            const top = y(d.revenue_pence);
            const height = Math.max(0, y(0) - top);
            const radius = Math.min(4, barWidth / 2, height);

            return (
              <g
                key={d.weekday}
                tabIndex={0}
                role="img"
                aria-label={`${WEEKDAY_LONG[d.weekday - 1]}: ${formatPence(d.revenue_pence)} from ${d.orders} ${d.orders === 1 ? "order" : "orders"}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none [&:focus-visible>rect:first-child]:stroke-[var(--viz-accent)]"
              >
                {/* Hit target: the whole slot, top to axis, well beyond the painted bar. */}
                <rect x={cx - slot / 2} y={MARGIN.top} width={slot} height={plotHeight} fill="transparent" strokeWidth={2} />
                {height > 0 && (
                  <path
                    d={`M${cx - barWidth / 2},${y(0)} V${top + radius} Q${cx - barWidth / 2},${top} ${cx - barWidth / 2 + radius},${top} H${cx + barWidth / 2 - radius} Q${cx + barWidth / 2},${top} ${cx + barWidth / 2},${top + radius} V${y(0)} Z`}
                    className="fill-[var(--viz-accent)]"
                    opacity={active === i ? 0.75 : 1}
                  />
                )}
                <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-[var(--viz-ink-3)] text-[11px]">
                  {WEEKDAY_SHORT[d.weekday - 1]}
                </text>
                {i === peakIndex && (
                  <text x={cx} y={top - 6} textAnchor="middle" className="fill-[var(--viz-ink)] text-[11px] font-semibold">
                    {formatAxisPounds(d.revenue_pence)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {active !== null && width > 0 && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 w-max rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs shadow-lg"
          style={{
            left: MARGIN.left + slot * active + slot / 2,
            top: 0,
            transform: MARGIN.left + slot * active > width * 0.6 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
          }}
        >
          <p className="text-[var(--viz-ink-2)]">{WEEKDAY_LONG[data[active].weekday - 1]}</p>
          <p>
            <span className="font-semibold text-[var(--viz-ink)]">{formatPence(data[active].revenue_pence)}</span>{" "}
            <span className="text-[var(--viz-ink-2)]">
              · {data[active].orders} {data[active].orders === 1 ? "order" : "orders"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
