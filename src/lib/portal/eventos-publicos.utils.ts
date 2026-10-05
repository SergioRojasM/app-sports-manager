import { toDateKeyInBogota } from '@/lib/portal/eventos.utils';
import type { EventoPublicoListItem, EventosPublicosDateChip } from '@/types/portal/eventos.types';

/** Days shown by the portal listing before the user picks a range (US-0120). */
export const EVENTOS_DEFAULT_WINDOW_DAYS = 60;

/** `YYYY-MM-DD` from calendar parts, without going through a time zone. */
export function dateKeyFromParts(year: number, monthIndex: number, day: number): string {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return date.toISOString().slice(0, 10);
}

/** Shifts a `YYYY-MM-DD` key by whole days (calendar arithmetic, time-zone free). */
export function addDaysKeyInBogota(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return dateKeyFromParts(year, month - 1, day + days);
}

export function todayKeyInBogota(now: Date = new Date()): string {
  return toDateKeyInBogota(now);
}

/** Monday of the week containing `dateKey` (weeks start on Monday). */
function mondayOf(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDaysKeyInBogota(dateKey, -((weekday + 6) % 7));
}

/** Date range of a quick chip, as Bogotá date keys (both inclusive). */
export function computeEventosChipRange(
  chip: EventosPublicosDateChip,
  now: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  const today = todayKeyInBogota(now);

  if (chip === 'today') return { dateFrom: today, dateTo: today };

  if (chip === 'tomorrow') {
    const tomorrow = addDaysKeyInBogota(today, 1);
    return { dateFrom: tomorrow, dateTo: tomorrow };
  }

  const monday = mondayOf(today);
  if (chip === 'this_week') return { dateFrom: monday, dateTo: addDaysKeyInBogota(monday, 6) };

  // weekend: the Saturday/Sunday of the current week
  return { dateFrom: addDaysKeyInBogota(monday, 5), dateTo: addDaysKeyInBogota(monday, 6) };
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Case- and accent-insensitive match over the fields a visitor would search by. */
export function matchesEventoSearch(item: EventoPublicoListItem, needle: string): boolean {
  const normalizedNeedle = normalizeSearch(needle.trim());
  if (!normalizedNeedle) return true;

  return [
    item.nombre,
    item.descripcion,
    item.nombreTenant,
    item.disciplinaNombre,
    item.escenarioNombre,
    item.puntoEncuentro,
    item.entrenadorNombre,
  ].some((field) => field != null && normalizeSearch(field).includes(normalizedNeedle));
}

/**
 * Back target from the `from` search param. Only same-origin absolute paths are honoured:
 * anything else (missing, relative, protocol-relative "//evil.com") falls back.
 */
export function resolveEventosOrigin(from: string | null, fallback: string): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return fallback;
  return from;
}

export function buildEventoPortalDetalleHref(eventoId: string, options: { entradas?: boolean; from?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.from) params.set('from', options.from);
  if (options.entradas) params.set('entradas', '1');
  const query = params.toString();
  return `/portal/eventos/${eventoId}${query ? `?${query}` : ''}`;
}

export function buildEventoLandingDetalleHref(eventoId: string, options: { entradas?: boolean; from?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.from) params.set('from', options.from);
  if (options.entradas) params.set('entradas', '1');
  const query = params.toString();
  return `/eventos/${eventoId}${query ? `?${query}` : ''}`;
}

/** The value itself when it is an http(s) URL, otherwise null (never link other schemes). */
export function toHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
