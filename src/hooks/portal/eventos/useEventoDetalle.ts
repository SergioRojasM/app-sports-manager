'use client';

import { useCallback, useEffect, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import type { EventoPublicoDetalle } from '@/types/portal/eventos.types';

/**
 * One event for the detail pages (US-0120). After loading, `evento === null` means "not found"
 * (unknown, malformed, or not visible on this surface), which is distinct from `error`.
 */
export function useEventoDetalle(eventoId: string, options: { soloPublicos: boolean }) {
  const { soloPublicos } = options;
  const [evento, setEvento] = useState<EventoPublicoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setEvento(await eventosService.getEventoPublicado(eventoId, { soloPublicos }));
    } catch (loadError) {
      console.error('useEventoDetalle: failed to load event', loadError);
      setEvento(null);
      setError('No fue posible cargar el evento.');
    } finally {
      setLoading(false);
    }
  }, [eventoId, soloPublicos]);

  useEffect(() => {
    void load();
  }, [load]);

  return { evento, loading, error, refetch: load };
}
