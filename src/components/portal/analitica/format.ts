/** Shared number/date formatters for the analytics page and its charts. */

export const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const integer = new Intl.NumberFormat('es-CO');
const oneDecimal = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const upToOneDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

export const percent = (value: number | null) => value === null ? 'Sin capacidad' : `${value.toFixed(1)}%`;

/** es-CO number with exactly one decimal ("2,5"). */
export const decimal1 = (value: number) => oneDecimal.format(value);

/**
 * Compact COP for bar labels: "$ 1,2 M", "$ 850 mil". Written by hand because
 * Intl's es-CO compact notation renders thousands as "k".
 */
export function compactCurrency(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$ ${upToOneDecimal.format(value / 1_000_000)} M`;
  if (abs >= 1_000) return `$ ${upToOneDecimal.format(value / 1_000)} mil`;
  return `$ ${integer.format(value)}`;
}

/** Share of `total` as a rounded percentage label ("75%"); "0%" when total is 0. */
export const share = (value: number, total: number) => `${total > 0 ? Math.round((value / total) * 100) : 0}%`;

const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' });

/** "mar" or, when the series spans several years, "mar 26". `monthStart` is `YYYY-MM-DD`. */
export function monthLabel(monthStart: string, multiYear: boolean) {
  const month = monthFormatter.format(new Date(`${monthStart}T12:00:00Z`)).replace('.', '');
  return multiYear ? `${month} ${monthStart.slice(2, 4)}` : month;
}

/** True when the monthly series covers more than one calendar year. */
export const spansYears = (rows: Array<{ monthStart: string }>) =>
  new Set(rows.map((row) => row.monthStart.slice(0, 4))).size > 1;
