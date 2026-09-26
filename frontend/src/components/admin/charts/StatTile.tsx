import type { ReactNode } from "react";
import clsx from "clsx";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "./Sparkline";

interface StatTileProps {
  /** Sentence case, no trailing colon. */
  label: string;
  value: string;
  /** Percent change against the previous period; null when there's nothing to compare with. */
  change?: number | null;
  /** "vs previous 30 days" — the change is always stated against a named period. */
  comparison?: string;
  /** Whether an increase is good news (false for e.g. refunds). Decides the colour of the delta. */
  upIsGood?: boolean;
  trend?: number[];
  /** The one number the page leads with: ≥48px. Exactly one per view. */
  hero?: boolean;
  footnote?: ReactNode;
  className?: string;
}

/**
 * A single headline number. Delta colour = direction × whether up is good, and
 * is always paired with an arrow and a signed figure — never colour alone.
 */
export function StatTile({
  label,
  value,
  change,
  comparison,
  upIsGood = true,
  trend,
  hero,
  footnote,
  className,
}: StatTileProps) {
  const direction = change == null ? null : change > 0 ? "up" : change < 0 ? "down" : "flat";
  const good = direction === "up" ? upIsGood : direction === "down" ? !upIsGood : null;
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <div className={clsx("viz min-w-0 rounded-xl border border-ink/10 bg-white p-4 sm:p-5", className)}>
      <p className="text-xs text-[var(--viz-ink-2)]">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p
          className={clsx(
            "min-w-0 truncate font-sans font-semibold leading-none text-[var(--viz-ink)]",
            hero ? "text-5xl" : "text-3xl",
          )}
        >
          {value}
        </p>
        {trend && <Sparkline values={trend} />}
      </div>

      {/* undefined = this figure has no comparison by design; null = it should, but there's no earlier period. */}
      {change !== undefined && (
        <p
          className={clsx(
            "mt-3 flex items-center gap-1 text-xs",
            good === true && "text-[var(--viz-up)]",
            good === false && "text-[var(--viz-down)]",
            good === null && "text-[var(--viz-ink-3)]",
          )}
        >
          {change === null ? (
            <span>No earlier period to compare</span>
          ) : (
            <>
              <Icon size={13} aria-hidden="true" />
              <span className="font-medium">
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              {comparison && <span className="text-[var(--viz-ink-3)]">{comparison}</span>}
            </>
          )}
        </p>
      )}

      {footnote && <p className={clsx("text-xs text-[var(--viz-ink-3)]", change === undefined ? "mt-3" : "mt-1")}>{footnote}</p>}
    </div>
  );
}
