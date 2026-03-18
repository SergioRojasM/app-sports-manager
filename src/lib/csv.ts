/**
 * RFC 4180-compliant CSV generation and browser download utilities.
 */

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvString<T extends Record<string, unknown>>(
  rows: T[],
  headers?: (keyof T)[],
): string {
  const keys = headers ?? (rows.length > 0 ? (Object.keys(rows[0]) as (keyof T)[]) : []);
  const headerLine = keys.map((k) => escapeCsvField(String(k))).join(',');

  if (rows.length === 0) return headerLine;

  const dataLines = rows.map((row) =>
    keys.map((k) => escapeCsvField(row[k] as string | null | undefined)).join(','),
  );

  return [headerLine, ...dataLines].join('\n');
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = 'text/csv;charset=utf-8;',
): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
