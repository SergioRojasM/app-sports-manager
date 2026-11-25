import { formatDateKeyLabel } from '@/lib/portal/eventos.utils';
import type { EventoListItem } from '@/types/portal/eventos.types';

/** Cells per month grid: 6 Monday-first weeks, so the card keeps its height across months (`ZYxt2`). */
export const CALENDAR_CELLS = 42;

/** Event pills shown in a day cell before "+N" (two 37px pills fit the 95px cell). */
export const MAX_PILLS_PER_DAY = 2;

export type CalendarCell = {
  /** `YYYY-MM-DD` of the cell's day, in or out of the displayed month. */
  dateKey: string;
  dayNumber: number;
  /** false for the previous / next month days that pad the grid. */
  inMonth: boolean;
  /** Saturday or Sunday. */
  isWeekend: boolean;
};

const DAY_MS = 86_400_000;

/** Monday-first 6-week grid for the month starting at `monthStartDate` (`YYYY-MM-01`). */
export function buildCalendarCells(monthStartDate: string): CalendarCell[] {
  const monthStart = new Date(`${monthStartDate}T00:00:00.000Z`);
  const month = monthStart.getUTCMonth();
  const mondayOffset = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = monthStart.getTime() - mondayOffset * DAY_MS;

  return Array.from({ length: CALENDAR_CELLS }, (_, index) => {
    const day = new Date(gridStart + index * DAY_MS);
    return {
      dateKey: day.toISOString().slice(0, 10),
      dayNumber: day.getUTCDate(),
      inMonth: day.getUTCMonth() === month,
      isWeekend: index % 7 >= 5,
    };
  });
}

export type EventoPillTone = 'confirmado' | 'cancelado' | 'borrador';

/** Visual family of an event pill in a day cell; `inactivo` is an extra marker, not a tone. */
export function pillTone(evento: EventoListItem): EventoPillTone {
  if (evento.borrador) return 'borrador';
  return evento.estado === 'cancelado' ? 'cancelado' : 'confirmado';
}

/**
 * "1 evento" / "3 eventos, 1 inactivo, 1 cancelado" / "sin eventos" — part of the day cell's
 * accessible name, so cancelled and inactive events are never conveyed by the pill style alone.
 */
export function eventCountLabel(eventos: EventoListItem[]): string {
  const count = eventos.length;
  if (count === 0) return 'sin eventos';
  const inactivos = eventos.filter((evento) => !evento.activo).length;
  const cancelados = eventos.filter((evento) => pillTone(evento) === 'cancelado').length;
  const parts = [count === 1 ? '1 evento' : `${count} eventos`];
  if (inactivos > 0) parts.push(inactivos === 1 ? '1 inactivo' : `${inactivos} inactivos`);
  if (cancelados > 0) parts.push(cancelados === 1 ? '1 cancelado' : `${cancelados} cancelados`);
  return parts.join(', ');
}

/** Accessible name of a day cell: "21 de noviembre, 2 eventos, 1 inactivo". */
export function dayAriaLabel(dateKey: string, eventos: EventoListItem[]): string {
  return `${formatDateKeyLabel(dateKey)}, ${eventCountLabel(eventos)}`;
}
