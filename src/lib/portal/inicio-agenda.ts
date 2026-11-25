import { bogotaDayEndIso } from '@/lib/portal/bogota-date';
import type { InicioAgendaDia, InicioEntrenamiento, InicioVentana } from '@/types/portal/inicio.types';

const TIME_ZONE = 'America/Bogota';
const DIAS_AGENDA = 7;
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const DOW_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` of an instant in Bogotá. */
export function bogotaDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/** Calendar arithmetic on a `YYYY-MM-DD` key (UTC math, no time zone involved). */
function addDays(key: string, days: number): { key: string; date: Date } {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return { key: date.toISOString().slice(0, 10), date };
}

function buildDia(key: string, date: Date): InicioAgendaDia {
  const weekday = date.getUTCDay();
  const dia = date.getUTCDate();
  return { key, dow: DOW[weekday], dia, nombreLargo: `${DOW_LARGO[weekday]} ${dia}` };
}

/** "15 – 21 nov" within a month, "28 nov – 4 dic" across months. */
export function formatRangoLabel(primero: string, ultimo: string): string {
  const [, m1, d1] = primero.split('-').map(Number);
  const [, m2, d2] = ultimo.split('-').map(Number);
  if (m1 === m2) return `${d1} – ${d2} ${MESES[m2 - 1]}`;
  return `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]}`;
}

/** 7-day agenda window starting today (Bogotá). `desde` is `now`, so sessions that already started are excluded. */
export function buildAgendaVentana(now: Date): InicioVentana {
  const hoyKey = bogotaDayKey(now);
  const dias = Array.from({ length: DIAS_AGENDA }, (_, i) => {
    const { key, date } = addDays(hoyKey, i);
    return buildDia(key, date);
  });
  const ultimo = dias[dias.length - 1].key;
  return {
    desde: now.toISOString(),
    hasta: new Date(bogotaDayEndIso(ultimo)).toISOString(),
    hoyKey,
    dias,
    rangoLabel: formatRangoLabel(hoyKey, ultimo),
  };
}

/** Sessions grouped by Bogotá day key, in ascending start time; every window day has an entry. */
export function agruparPorDia(
  entrenamientos: InicioEntrenamiento[],
  dias: InicioAgendaDia[],
): Record<string, InicioEntrenamiento[]> {
  const grupos: Record<string, InicioEntrenamiento[]> = Object.fromEntries(dias.map((d) => [d.key, []]));
  const ordenados = [...entrenamientos].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  for (const e of ordenados) {
    grupos[bogotaDayKey(new Date(e.fecha_hora))]?.push(e);
  }
  return grupos;
}

const horaFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "5:30 am" / "7:00 pm" in Bogotá. */
export function formatAgendaHora(iso: string): string {
  return horaFormatter.format(new Date(iso)).replace(/\s?(AM|PM)$/, (_, p: string) => ` ${p.toLowerCase()}`);
}

/** "30 nov 2026" from a date-only `YYYY-MM-DD` value, without time-zone shifts. */
export function formatFechaCorta(dateOnly: string | null): string {
  if (!dateOnly) return '—';
  const [y, m, d] = dateOnly.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return `${d} ${MESES[m - 1]} ${y}`;
}

/** "30 nov" from a date-only `YYYY-MM-DD` value. */
export function formatDiaMes(dateOnly: string): string {
  const [, m, d] = dateOnly.slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]}`;
}
