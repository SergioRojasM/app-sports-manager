import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import { toDateKeyInBogota } from '@/lib/portal/eventos.utils';

const DAY_MS = 86_400_000;
const TIME_ZONE = 'America/Bogota';

function keyToDayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/**
 * Countdown pill of the ticket card (grit-arena-v3 `i54yXM`), by Bogotá calendar days:
 * "Faltan N días" · "Mañana" · "Hoy" · "Finalizado"; null for undated events. `estilo: 'en'` gives
 * the check-in card wording "En N días" (`LV7I0` `D8iSXX`).
 */
export function getCountdown(
  fechaHora: string | null,
  now: Date = new Date(),
  { estilo = 'faltan' }: { estilo?: 'faltan' | 'en' } = {},
): { label: string; pasado: boolean } | null {
  if (!fechaHora) return null;
  const diff = keyToDayNumber(toDateKeyInBogota(fechaHora)) - keyToDayNumber(toDateKeyInBogota(now));
  if (diff < 0) return { label: 'Finalizado', pasado: true };
  if (diff === 0) return { label: 'Hoy', pasado: false };
  if (diff === 1) return { label: 'Mañana', pasado: false };
  return { label: estilo === 'en' ? `En ${diff} días` : `Faltan ${diff} días`, pasado: false };
}

const longDateFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });

/** "Sábado 21 de noviembre · 4:20 pm" in Bogotá; "Fecha por definir" when undated. */
export function formatFechaLarga(fechaHora: string | null): string {
  if (!fechaHora) return 'Fecha por definir';
  const fecha = longDateFormatter.format(new Date(fechaHora)).replace(',', '');
  const capitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  return `${capitalizada} · ${formatHoraCorta(fechaHora)}`;
}
