'use client';

import { useEffect, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

export const HOME_EVENTOS_LIMIT = 12;

/** Upcoming public events for the app home ribbon (US-0140). */
export function useHomeEventos() {
  const [items, setItems] = useState<EventoPublicoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    eventosService
      // Always public-only on the home, even when the browser has a session
      .listEventosPublicados({ soloPublicos: true, limit: HOME_EVENTOS_LIMIT })
      .then((eventos) => {
        if (active) setItems(eventos);
      })
      .catch((loadError) => {
        console.error('useHomeEventos: failed to load events', loadError);
        if (active) {
          setItems([]);
          setError('No fue posible cargar los eventos.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { items, loading, error };
}
