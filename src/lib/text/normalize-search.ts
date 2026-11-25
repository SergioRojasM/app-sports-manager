/** Lowercases and strips accents so "Natación" matches "natacion" in client-side searches. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** True when `needle` (normalized, trimmed) is empty or contained in any of the fields. */
export function matchesSearch(fields: Array<string | null | undefined>, needle: string): boolean {
  const normalizedNeedle = normalizeSearch(needle.trim());
  if (!normalizedNeedle) return true;
  return fields.some((field) => field != null && normalizeSearch(field).includes(normalizedNeedle));
}
