"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatAxisPounds, formatDayMonth, formatMonthYear, formatPence, formatWeekdayDate } from "@/lib/money";
import { niceAxis, spreadIndices } from "@/lib/chartScale";
import { useElementWidth } from "@/lib/useElementWidth";
import type { AdminAnalytics } from "@/lib/types";

type Point = AdminAnalytics["timeseries"][number];
type Granularity = AdminAnalytics["range"]["granularity"];

const HEIGHT = 240;
const MARGIN = { top: 14, right: 14, bottom: 30, left: 48 };

function axisLabel(date: string, granularity: Granularity): string {
  return granularity === "month" ? formatMonthYear(date) : formatDayMonth(date);
}

function tooltipTitle(date: string, granularity: Granularity): string {
  if (granularity === "month") return formatMonthYear(date);
  if (granularity === "week") return `Week of ${formatDayMonth(date)}`;
  return formatWeekdayDate(date);
}

/**
 * Revenue over time: this period in the accent, the previous period behind it
 * in de-emphasis grey (one series is the point, the other is context). Hover or
 * touch scrubs a crosshair that snaps to the nearest day/week/month; the arrow
 * keys do the same once the chart has focus, so the tooltip never gates a value.
 */
export function RevenueChart({
  data,
  granularity,
  hasPrevious,
}: {
  data: Point[];
  granularity: Granularity;
  hasPrevious: boolean;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const count = data.length;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const peak = Math.max(0, ...data.map((d) => Math.max(d.revenue_pence, d.previous_revenue_pence ?? 0)));
  const axis = niceAxis(peak);

  const x = (i: number) => MARGIN.left + (count === 1 ? plotWidth / 2 : (i * plotWidth) / (count - 1));
  const y = (value: number) => MARGIN.top + plotHeight - (value / axis.max) * plotHeight;

  const currentPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.revenue_pence).toFixed(1)}`).join(" ");
  const areaPath = `${currentPath} L${x(count - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  // The previous period can be a bucket shorter/longer; draw only where it has a value.
  const previousPath = data
    .map((d, i) => (d.previous_revenue_pence === null ? null : { i, v: d.previous_revenue_pence }))
    .filter((p): p is { i: number; v: number } => p !== null)
    .map((p, n) => `${n === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(" ");

  const labelIndices = spreadIndices(count, width < 480 ? 3 : width < 720 ? 4 : 6);
  const point = active !== null ? data[active] : null;

  const nearest = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / Math.max(box.width, 1);
    return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const current = active ?? count - 1;
    const next =
      event.key === "ArrowLeft" ? current - 1
      : event.key === "ArrowRight" ? current + 1
      : event.key === "Home" ? 0
      : event.key === "End" ? count - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.min(count - 1, Math.max(0, next)));
  };

  if (count === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label="Revenue over time. Use the left and right arrow keys to move between points."
      onKeyDown={onKeyDown}
      onFocus={() => setActive((current) => current ?? count - 1)}
      onBlur={() => setActive(null)}
      className="relative rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--viz-accent)]"
      style={{ height: HEIGHT }}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden="true" className="block overflow-visible">
          {/* Hairline, solid, recessive grid — and the y labels that carry the values not labelled directly. */}
          {axis.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                strokeWidth={1}
                className={tick === 0 ? "stroke-[var(--viz-axis)]" : "stroke-[var(--viz-grid)]"}
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-[var(--viz-ink-3)] text-[11px] tabular-nums"
              >
                {formatAxisPounds(tick)}
              </text>
            </g>
          ))}

          {labelIndices.map((index, n) => (
            <text
              key={index}
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor={n === 0 ? "start" : n === labelIndices.length - 1 ? "end" : "middle"}
              className="fill-[var(--viz-ink-3)] text-[11px]"
            >
              {axisLabel(data[index].date, granularity)}
            </text>
          ))}

          <path d={areaPath} className="fill-[var(--viz-accent)]" fillOpacity={0.1} />
          {hasPrevious && previousPath && (
            <path
              d={previousPath}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-[var(--viz-context)]"
            />
          )}
          <path
            d={currentPath}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-[var(--viz-accent)]"
          />

          {/* End marker: 8px dot with a 2px surface ring so it stays legible over the line. */}
          <circle cx={x(count - 1)} cy={y(data[count - 1].revenue_pence)} r={6} className="fill-[var(--viz-surface)]" />
          <circle cx={x(count - 1)} cy={y(data[count - 1].revenue_pence)} r={4} className="fill-[var(--viz-accent)]" />

          {active !== null && point && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={y(0)} strokeWidth={1} className="stroke-[var(--viz-axis)]" />
              {hasPrevious && point.previous_revenue_pence !== null && (
                <>
                  <circle cx={x(active)} cy={y(point.previous_revenue_pence)} r={6} className="fill-[var(--viz-surface)]" />
                  <circle cx={x(active)} cy={y(point.previous_revenue_pence)} r={4} className="fill-[var(--viz-context)]" />
                </>
              )}
              <circle cx={x(active)} cy={y(point.revenue_pence)} r={6} className="fill-[var(--viz-surface)]" />
              <circle cx={x(active)} cy={y(point.revenue_pence)} r={4} className="fill-[var(--viz-accent)]" />
            </g>
          )}

          {/* The hit target is the whole plot, far larger than any mark; pan-y lets the page still scroll vertically on touch. */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            style={{ touchAction: "pan-y" }}
            onPointerMove={(event) => setActive(nearest(event))}
            onPointerDown={(event) => setActive(nearest(event))}
            onPointerLeave={(event) => event.pointerType === "mouse" && setActive(null)}
          />
        </svg>
      )}

      {active !== null && point && width > 0 && (
        <div
          role="presentation"
          className="pointer-events-none absolute top-2 z-10 w-max min-w-40 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: x(active),
            transform: x(active) > width * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <p className="text-[var(--viz-ink-2)]">{tooltipTitle(point.date, granularity)}</p>
          <dl className="mt-1.5 space-y-1">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-3 rounded bg-[var(--viz-accent)]" />
              <dd className="font-semibold text-[var(--viz-ink)]">{formatPence(point.revenue_pence)}</dd>
              <dt className="text-[var(--viz-ink-2)]">revenue</dt>
            </div>
            {hasPrevious && point.previous_revenue_pence !== null && (
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-0.5 w-3 rounded bg-[var(--viz-context)]" />
                <dd className="font-semibold text-[var(--viz-ink)]">{formatPence(point.previous_revenue_pence)}</dd>
                <dt className="text-[var(--viz-ink-2)]">previous</dt>
              </div>
            )}
            <div className="text-[var(--viz-ink-2)]">
              {point.orders} {point.orders === 1 ? "order" : "orders"}
            </div>
          </dl>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {point
          ? `${tooltipTitle(point.date, granularity)}: ${formatPence(point.revenue_pence)} revenue from ${point.orders} orders.`
          : ""}
      </p>
    </div>
  );
}
