import type { PrecioItem } from '@/types/portal/entrenamientos-publicos.types';

export const EVENTOS_TIME_ZONE = 'America/Bogota';

/** Bogotá has no DST, so a fixed offset is enough to build month boundaries. */
const BOGOTA_UTC_OFFSET = '-05:00';

/** `YYYY-MM-DD` of an instant as seen in Bogotá. */
export function toDateKeyInBogota(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENTOS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-01` of the Bogotá month containing `value`. */
export function toMonthStartInBogota(value: string | Date): string {
  return `${toDateKeyInBogota(value).slice(0, 7)}-01`;
}

/** Shifts a `YYYY-MM-01` key by `delta` months. */
export function shiftMonthStart(monthStartDate: string, delta: number): string {
  const [year, month] = monthStartDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

/** `[desde, hasta)` ISO range covering a Bogotá month. */
export function getMonthRangeInBogota(monthStartDate: string): { desde: string; hasta: string } {
  const nextMonthStart = shiftMonthStart(monthStartDate, 1);
  return {
    desde: new Date(`${monthStartDate}T00:00:00${BOGOTA_UTC_OFFSET}`).toISOString(),
    hasta: new Date(`${nextMonthStart}T00:00:00${BOGOTA_UTC_OFFSET}`).toISOString(),
  };
}

export function formatMonthLabel(monthStartDate: string): string {
  const label = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthStartDate}T00:00:00.000Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatEventoFecha(fechaHora: string | null): string {
  if (!fechaHora) return 'Fecha por definir';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: EVENTOS_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(fechaHora));
}

export function formatEventoHora(fechaHora: string | null): string {
  if (!fechaHora) return '';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: EVENTOS_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(fechaHora));
}

/** Human date label for a `YYYY-MM-DD` key, e.g. "30 de septiembre". */
export function formatDateKeyLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

export function formatDuracion(minutos: number | null): string | null {
  if (!minutos) return null;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export function formatCupo(cupoMaximo: number | null): string {
  return cupoMaximo ? `Cupo: ${cupoMaximo}` : 'Cupo ilimitado';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

/** Same rule as the public-training card: none → Gratis, one → price, many → "Desde" cheapest. */
export function formatEventoPrecio(precio: PrecioItem[]): string {
  if (precio.length === 0) return 'Gratis';
  if (precio.length === 1) return formatCurrency(precio[0].precio);
  return `Desde ${formatCurrency(Math.min(...precio.map((item) => item.precio)))}`;
}
