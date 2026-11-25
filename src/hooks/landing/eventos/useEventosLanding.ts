'use client';

import { useCallback, useEffect, useState } from 'react';
import { EVENTOS_PUBLICOS_LIMIT, eventosService } from '@/services/supabase/portal/eventos.service';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

/** Public events of every tenant for the anonymous /eventos page (US-0120). */
export function useEventosLanding() {
  const [items, setItems] = useState<EventoPublicoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Always public-only here, even when the browser has a session
      const eventos = await eventosService.listEventosPublicados({ soloPublicos: true });
      if (eventos.length >= EVENTOS_PUBLICOS_LIMIT) {
        console.warn(`useEventosLanding: the listing reached the ${EVENTOS_PUBLICOS_LIMIT}-event cap`);
      }
      setItems(eventos);
    } catch (loadError) {
      console.error('useEventosLanding: failed to load events', loadError);
      setItems([]);
      setError('No fue posible cargar los eventos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    loading,
    error,
    refetch: load,
  };
}
