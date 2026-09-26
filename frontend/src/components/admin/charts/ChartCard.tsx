"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChartColumn, Table2 } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Legend row (only for two or more series — a single series is named by the title). */
  legend?: ReactNode;
  /** The same data as a table — the accessible equivalent of the chart. */
  table: ReactNode;
  children: ReactNode;
  /** Data is refetching: keep the previous render, dimmed. */
  busy?: boolean;
  className?: string;
}

/** Card frame for a chart: title, optional legend, and a chart ⇄ table toggle. */
export function ChartCard({ title, subtitle, legend, table, children, busy, className }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className={clsx("viz min-w-0 rounded-xl border border-ink/10 bg-white p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--viz-ink-3)]">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs text-[var(--viz-ink-2)] transition-colors hover:bg-ink/5"
        >
          {showTable ? <ChartColumn size={15} aria-hidden="true" /> : <Table2 size={15} aria-hidden="true" />}
          {showTable ? "Chart" : "Table"}
        </button>
      </div>

      {legend && !showTable && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--viz-ink-2)]">{legend}</div>}

      <div className={clsx("mt-3 transition-opacity duration-200", busy && "opacity-50")}>
        {showTable ? <div className="overflow-x-auto">{table}</div> : children}
      </div>
    </section>
  );
}

/** A simple data table for a chart's table view. Numeric columns align right. */
export function DataTable({
  columns,
  rows,
  empty = "No data for this period.",
}: {
  columns: Array<{ label: string; numeric?: boolean }>;
  rows: ReactNode[][];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-[var(--viz-ink-3)]">{empty}</p>;

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-ink/10 text-xs text-[var(--viz-ink-3)]">
        <tr>
          {columns.map((column) => (
            <th key={column.label} scope="col" className={clsx("py-2 pr-4 font-medium", column.numeric && "text-right")}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-ink/5">
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td
                key={j}
                className={clsx("py-2 pr-4 text-[var(--viz-ink)]", columns[j]?.numeric && "text-right tabular-nums")}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
