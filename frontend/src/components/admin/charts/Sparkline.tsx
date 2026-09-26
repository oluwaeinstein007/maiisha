/** A tiny trend line for a stat tile: de-emphasis grey, with the latest point picked out in the accent. */
export function Sparkline({ values, width = 96, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;

  const pad = 5; // room for the end dot and its ring
  const max = Math.max(...values, 1);
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => pad + (height - pad * 2) * (1 - v / max);

  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;

  return (
    <svg width={width} height={height} aria-hidden="true" className="viz shrink-0 overflow-visible">
      <path d={path} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--viz-context)]" />
      <circle cx={x(last)} cy={y(values[last])} r={5} className="fill-[var(--viz-surface)]" />
      <circle cx={x(last)} cy={y(values[last])} r={3.5} className="fill-[var(--viz-accent)]" />
    </svg>
  );
}
