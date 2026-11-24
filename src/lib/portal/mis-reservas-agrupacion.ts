import type { GritTagTone } from '@/components/ui';
import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import { addDaysKeyInBogota, todayKeyInBogota } from '@/lib/portal/eventos-publicos.utils';
import type { MisReservasMonthGroup, MisReservasStats, ReservaReportRow } from '@/types/portal/reservas.types';

const TIME_ZONE = 'America/Bogota';
const MAX_RANGE_DAYS = 60;
const DAY_MS = 86_400_000;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const monthKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' });
const monthLabelFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, month: 'long', year: 'numeric' });
const dayMonthFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, month: '2-digit', day: '2-digit' });

/** "SEPTIEMBRE 2026" — Bogotá month of an instant. */
export function formatMesOverline(iso: string): string {
  return monthLabelFormatter.format(new Date(iso)).replace(' de ', ' ').toUpperCase();
}

/**
 * Groups bookings by the Bogotá month of their training date, keeping the incoming order
 * (the service sorts by training date, newest first). Undated rows go to "SIN FECHA".
 */
export function groupReservasByMonth(rows: ReservaReportRow[]): MisReservasMonthGroup[] {
  const groups: MisReservasMonthGroup[] = [];
  const byKey = new Map<string, MisReservasMonthGroup>();

  for (const row of rows) {
    const key = row.entrenamiento_fecha ? monthKeyFormatter.format(new Date(row.entrenamiento_fecha)) : 'sin-fecha';
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: row.entrenamiento_fecha ? formatMesOverline(row.entrenamiento_fecha) : 'SIN FECHA', rows: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
}

/** Counts of the stats strip: all, attended, absent, cancelled. */
export function computeReservaStats(rows: ReservaReportRow[]): MisReservasStats {
  return rows.reduce<MisReservasStats>(
    (stats, row) => ({
      reservas: stats.reservas + 1,
      asistidas: stats.asistidas + (row.asistio === true ? 1 : 0),
      noAsistio: stats.noAsistio + (row.asistio === false ? 1 : 0),
      canceladas: stats.canceladas + (row.reserva_estado === 'cancelada' ? 1 : 0),
    }),
    { reservas: 0, asistidas: 0, noAsistio: 0, canceladas: 0 },
  );
}

/** "6:00 am" in Bogotá. */
export function formatHoraBogota(iso: string | null): string {
  return formatHoraCorta(iso);
}

/** "16 sep" — Bogotá day + short month of an instant; '—' when missing. */
export function formatFechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  // es-CO prints "1 de sept"; the design uses "1 sep", so build it from the Bogotá parts.
  const [month, day] = dayMonthFormatter.format(date).split('-').map(Number);
  return `${day} ${MESES[month - 1]}`;
}

const ESTADO_TAGS: Record<string, { label: string; tone: GritTagTone }> = {
  confirmada: { label: 'Confirmada', tone: 'accent' },
  completada: { label: 'Completada', tone: 'accent' },
  pendiente: { label: 'Pendiente', tone: 'warning' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
  rechazada: { label: 'Rechazada', tone: 'danger' },
};

/** Status tag of a booking row; unknown values are capitalised in the neutral tone. */
export function reservaEstadoTag(estado: string): { label: string; tone: GritTagTone } {
  return ESTADO_TAGS[estado] ?? { label: estado.charAt(0).toUpperCase() + estado.slice(1), tone: 'neutral' };
}

/** A confirmed (or completed) booking gets the accent date tile and full-ink name. */
export function isReservaDestacada(estado: string): boolean {
  return estado === 'confirmada' || estado === 'completada';
}

function dayNumber(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS : null;
}

/** Custom-range rule (unchanged from the v2 panel): end not before start, at most 60 days. */
export function validateDateRange(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'Selecciona las dos fechas.';
  const start = dayNumber(desde);
  const end = dayNumber(hasta);
  if (start === null || end === null) return 'Fecha inválida.';
  if (end < start) return 'La fecha final debe ser posterior a la inicial.';
  if (end - start > MAX_RANGE_DAYS) return `El rango de fechas no puede superar los ${MAX_RANGE_DAYS} días.`;
  return null;
}

/** "1 ago – 31 ago" for two 'YYYY-MM-DD' keys. */
export function formatRangoCorto(desde: string, hasta: string): string {
  const label = (key: string) => {
    const [, month, day] = key.split('-').map(Number);
    return `${day} ${MESES[month - 1]}`;
  };
  return `${label(desde)} – ${label(hasta)}`;
}

export type MisReservasDatePreset = 'ultimos_7_dias' | 'ultimo_mes' | 'mes_a_la_fecha';

/** Bogotá date range of a preset (today inclusive). */
export function computePresetRange(preset: MisReservasDatePreset, now: Date = new Date()): { desde: string; hasta: string } {
  const hasta = todayKeyInBogota(now);
  switch (preset) {
    case 'ultimos_7_dias':
      return { desde: addDaysKeyInBogota(hasta, -7), hasta };
    case 'ultimo_mes':
      return { desde: addDaysKeyInBogota(hasta, -30), hasta };
    case 'mes_a_la_fecha':
      return { desde: `${hasta.slice(0, 7)}-01`, hasta };
  }
}
