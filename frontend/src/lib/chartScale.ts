/** A "nice" axis for values in pence: round pound ticks (£0, £50, £100…) covering the data. */
export function niceAxis(maxPence: number, intervals = 4): { max: number; ticks: number[] } {
  const maxPounds = Math.max(maxPence / 100, 1);
  const raw = maxPounds / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const niceResidual = residual <= 1.5 ? 1 : residual <= 3 ? 2 : residual <= 6 ? 5 : 10;
  const step = Math.max(1, niceResidual * magnitude);
  const top = Math.ceil(maxPounds / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= top + 1e-9; value += step) ticks.push(Math.round(value * 100));
  return { max: top * 100, ticks };
}

/** Up to `count` evenly spread indices from 0..length-1, always including both ends. */
export function spreadIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const picked = new Set<number>();
  for (let i = 0; i < count; i++) picked.add(Math.round((i * (length - 1)) / (count - 1)));
  return [...picked].sort((a, b) => a - b);
}
