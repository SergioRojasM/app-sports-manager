/**
 * Period maths for the v3 subscription card (grit-arena-v3 `LSqV5`). `fecha_inicio` / `fecha_fin`
 * are `date` columns ('YYYY-MM-DD'), so they are compared as UTC day numbers and never parsed with
 * `new Date(str)` in the browser's zone (which would show 30 nov as 29 nov in Bogotá).
 */

const DAY_MS = 86_400_000;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type DateParts = { year: number; month: number; day: number };

function parseDateOnly(value: string | null): DateParts | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function toDayNumber({ year, month, day }: DateParts): number {
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export type PeriodoEstado = 'futuro' | 'en_curso' | 'finalizado' | 'sin_fechas';

export type Periodo = {
  estado: PeriodoEstado;
  /** "Inicia en N días" · "Día N de M" · "Finalizado" · "Sin fechas". */
  label: string;
  /** Elapsed share of the period, 0–100 (0 when it has not started, 100 when finished). */
  pct: number;
};

/** Position of `hoyKey` (Bogotá 'YYYY-MM-DD') inside the inclusive period [inicio, fin]. */
export function getPeriodo(inicio: string | null, fin: string | null, hoyKey: string): Periodo {
  const start = parseDateOnly(inicio);
  const end = parseDateOnly(fin);
  const today = parseDateOnly(hoyKey);
  if (!start || !end || !today) return { estado: 'sin_fechas', label: 'Sin fechas', pct: 0 };

  const startDay = toDayNumber(start);
  const endDay = toDayNumber(end);
  const todayDay = toDayNumber(today);

  if (todayDay < startDay) {
    const faltan = startDay - todayDay;
    return { estado: 'futuro', label: faltan === 1 ? 'Inicia mañana' : `Inicia en ${faltan} días`, pct: 0 };
  }
  if (todayDay > endDay) return { estado: 'finalizado', label: 'Finalizado', pct: 100 };

  const total = endDay - startDay + 1;
  const dia = todayDay - startDay + 1;
  return { estado: 'en_curso', label: `Día ${dia} de ${total}`, pct: Math.round((dia / total) * 100) };
}

/** Short date-only label: "18 ago", plus the year when asked ("17 sep 2026"). */
export function formatFechaCortaDateOnly(value: string | null, withYear = false): string | null {
  const parts = parseDateOnly(value);
  if (!parts) return null;
  const base = `${parts.day} ${MESES[parts.month - 1]}`;
  return withYear ? `${base} ${parts.year}` : base;
}

/** "18 ago – 17 sep 2026"; both years when they differ ("28 dic 2025 – 27 ene 2026"); null without dates. */
export function formatRangoFechas(inicio: string | null, fin: string | null): string | null {
  const start = parseDateOnly(inicio);
  const end = parseDateOnly(fin);
  if (!start && !end) return null;
  if (start && end) {
    const sameYear = start.year === end.year;
    return `${formatFechaCortaDateOnly(inicio, !sameYear)} – ${formatFechaCortaDateOnly(fin, true)}`;
  }
  return start ? `Desde ${formatFechaCortaDateOnly(inicio, true)}` : `Hasta ${formatFechaCortaDateOnly(fin, true)}`;
}
