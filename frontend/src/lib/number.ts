/**
 * Keeps only characters a numeric field should ever contain. A native
 * `<input type="number">` looks right for this, but it isn't: when the typed
 * text can't parse as a number (a stray letter, two decimal points), the DOM
 * silently reports `value` as `""` while still *displaying* whatever was
 * typed — so the field can show "30hbhgg" while React's state holds "". Using
 * `type="text"` with this sanitizer instead means the displayed value and the
 * state value are always the same string, one every caller can trust.
 */
export function sanitizeNumeric(raw: string, options: { decimal?: boolean } = {}): string {
  let value = raw.replace(options.decimal ? /[^\d.]/g : /\D/g, "");

  if (options.decimal) {
    const firstDot = value.indexOf(".");
    if (firstDot !== -1) {
      value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, "");
    }
  }

  return value;
}
