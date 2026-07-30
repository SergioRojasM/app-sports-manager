/**
 * Slugifies a label into a `snake_case` machine key: lowercase, diacritics
 * stripped, non-alphanumerics collapsed to `_`, leading digits/underscores trimmed.
 */
export function slugify(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[^a-z]+/, '');

  return slug || 'campo';
}
