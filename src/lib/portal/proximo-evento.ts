import { toDateKeyInBogota } from '@/lib/portal/eventos.utils';
import type { EventoListItem } from '@/types/portal/eventos.types';

/**
 * The event shown in the calendar's "Próximo evento" panel (grit-arena-v3 `ZYxt2`): the earliest
 * published, confirmed event dated today or later in Bogotá. "Today" counts from 00:00, so an event
 * in progress is still the next one (same rule as the check-in selector).
 */
export function pickProximoEvento(eventos: EventoListItem[], now: Date = new Date()): EventoListItem | null {
  const hoy = toDateKeyInBogota(now);
  let proximo: EventoListItem | null = null;
  for (const evento of eventos) {
    if (evento.borrador || evento.estado !== 'confirmado' || !evento.fechaHora) continue;
    if (toDateKeyInBogota(evento.fechaHora) < hoy) continue;
    if (!proximo || new Date(evento.fechaHora).getTime() < new Date(proximo.fechaHora as string).getTime()) {
      proximo = evento;
    }
  }
  return proximo;
}
