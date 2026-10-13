export const PRINTABLE_NAME_MAX_LENGTH = 24;

// Shared with the product form and cart. The server repeats this validation
// before checking catalog eligibility; a saved browser cart is never trusted.
export function normalizePrintableName(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 100 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error('invalid_printable_name');
  }
  const name = value.normalize('NFC').trim().replace(/ +/g, ' ');
  if (!name || [...name].length > PRINTABLE_NAME_MAX_LENGTH ||
      !/^[\p{L}\p{N}][\p{L}\p{M}\p{N} .'’\-]*$/u.test(name)) {
    throw new Error('invalid_printable_name');
  }
  return name;
}
