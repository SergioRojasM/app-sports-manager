'use client';

import { useEffect, useMemo, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { EVENTOS_DEFAULT_WINDOW_DAYS, addDaysKeyInBogota, todayKeyInBogota } from '@/lib/portal/eventos-publicos.utils';
import { toDateKeyInBogota } from '@/lib/portal/eventos.utils';
import type { MiCompra } from '@/types/portal/eventos-compras.types';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

const MAX_SUGERIDOS = 4;

/** Pure selection (exported for scratch checks): upcoming in the Bogotá window, not purchased, soonest first. */
export function seleccionarSugeridos(
  eventos: EventoPublicoListItem[],
  compradosIds: Set<string>,
  now: Date = new Date(),
): EventoPublicoListItem[] {
  const desde = todayKeyInBogota(now);
  const hasta = addDaysKeyInBogota(desde, EVENTOS_DEFAULT_WINDOW_DAYS);
  return eventos
    .filter((evento) => {
      if (!evento.fechaHora || compradosIds.has(evento.id)) return false;
      const key = toDateKeyInBogota(evento.fechaHora);
      return key >= desde && key <= hasta;
    })
    .sort((left, right) => (left.fechaHora ?? '').localeCompare(right.fechaHora ?? ''))
    .slice(0, MAX_SUGERIDOS);
}

/**
 * "Te puede interesar" on /portal/mis-entradas (grit-arena-v3 `gL5YX`). Runs in parallel with the
 * purchases; a failure only hides the section.
 */
export function useEventosSugeridos(compras: MiCompra[]): EventoPublicoListItem[] {
  const [eventos, setEventos] = useState<EventoPublicoListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    eventosService
      .listEventosPublicados({ soloPublicos: false })
      .then((items) => {
        if (!cancelled) setEventos(items);
      })
      .catch((loadError) => {
        console.error('useEventosSugeridos: failed to load events', loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const comprados = new Set<string>();
    for (const compra of compras) {
      comprados.add(compra.eventoId);
      compra.tickets.forEach((ticket) => comprados.add(ticket.eventoId));
    }
    return seleccionarSugeridos(eventos, comprados);
  }, [eventos, compras]);
}
