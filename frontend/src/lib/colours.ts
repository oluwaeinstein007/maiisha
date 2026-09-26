/**
 * Swatch colours for the product colour names the shop uses. Names are
 * free text in the admin, so anything not listed here simply gets a text
 * chip instead of a swatch — never a guessed colour.
 */
const SWATCHES: Record<string, string> = {
  black: "#111111",
  "natural black": "#1c1c1c",
  white: "#ffffff",
  ivory: "#f4efe0",
  grey: "#8a8d91",
  gray: "#8a8d91",
  charcoal: "#36454f",
  silver: "#c0c0c0",
  gold: "#c8a24a",
  navy: "#1f2a5c",
  emerald: "#0f7b5a",
  "ruby red": "#9b111e",
  red: "#c0262d",
  brown: "#6b4423",
  "chocolate brown": "#3b2314",
  tan: "#d2b48c",
  nude: "#e3bc9a",
  "nude rose": "#d9a5a0",
  "honey blonde": "#d9a441",
  // Foundation shades
  fair: "#f3d5b5",
  medium: "#c68e5b",
  deep: "#6f4630",
};

export function colourSwatch(name: string): string | null {
  return SWATCHES[name.trim().toLowerCase()] ?? null;
}
