"use client";

import { useState } from "react";
import clsx from "clsx";
import { Download } from "lucide-react";
import { RANGE_PRESETS, type RangeSelection } from "@/lib/useAnalytics";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

interface RangeFilterProps {
  value: RangeSelection;
  onChange: (next: RangeSelection) => void;
  /** Present on the analytics page only. */
  onExport?: () => void;
  exporting?: boolean;
}

/**
 * The one filter row above the charts: date-range presets first (nobody fights
 * a calendar for "last 30 days"), a custom range behind a toggle. Everything
 * below re-renders against the same slice.
 */
export function RangeFilter({ value, onChange, onExport, exporting }: RangeFilterProps) {
  const [customOpen, setCustomOpen] = useState(value.range === "custom");
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");

  const canApply = from !== "" && to !== "" && from <= to;
  const pill = "inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-colors";

  return (
    <div className="viz space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {RANGE_PRESETS.map((preset) => {
          const selected = value.range === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCustomOpen(false);
                onChange({ range: preset.key });
              }}
              className={clsx(pill, selected ? "border-ink bg-ink text-cream" : "border-ink/20 text-ink hover:border-ink")}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={value.range === "custom" || customOpen}
          onClick={() => setCustomOpen((open) => !open)}
          className={clsx(
            pill,
            value.range === "custom" ? "border-ink bg-ink text-cream" : "border-ink/20 text-ink hover:border-ink",
          )}
        >
          Custom
        </button>

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50"
          >
            <Download size={15} aria-hidden="true" />
            {exporting ? "Preparing…" : "Export orders (CSV)"}
          </button>
        )}
      </div>

      {customOpen && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-ink/10 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canApply) onChange({ range: "custom", from, to });
          }}
        >
          <label className="text-xs text-ink-soft">
            From
            <input
              type="date"
              value={from}
              max={to || today()}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block h-11 rounded-md border border-ink/20 bg-white px-3 text-base text-ink outline-none focus:border-gold sm:text-sm"
            />
          </label>
          <label className="text-xs text-ink-soft">
            To
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today()}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block h-11 rounded-md border border-ink/20 bg-white px-3 text-base text-ink outline-none focus:border-gold sm:text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={!canApply}
            className="h-11 rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-ink-soft disabled:bg-ink/30"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
