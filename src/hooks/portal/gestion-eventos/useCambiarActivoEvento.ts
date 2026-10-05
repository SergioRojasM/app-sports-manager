'use client';

import { useCallback, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { EventoServiceError, type EventoListItem } from '@/types/portal/eventos.types';

type UseCambiarActivoEventoOptions = {
  tenantId: string;
  onSuccess: (evento: EventoListItem, activo: boolean) => void;
};

/**
 * Quick activar/desactivar action for the management views: no confirmation modal, one call,
 * and the page refreshes on success. Ignores a second toggle while one is in flight.
 */
export function useCambiarActivoEvento({ tenantId, onSuccess }: UseCambiarActivoEventoOptions) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(
    async (evento: EventoListItem) => {
      if (pendingId) return;
      const activo = !evento.activo;
      setPendingId(evento.id);
      setError(null);
      try {
        await eventosService.updateActivoEvento(tenantId, evento.id, activo);
        onSuccess(evento, activo);
      } catch (err) {
        console.error('Failed to change evento activo:', err);
        setError(
          err instanceof EventoServiceError
            ? err.message
            : `No se pudo ${activo ? 'activar' : 'desactivar'} el evento.`,
        );
      } finally {
        setPendingId(null);
      }
    },
    [pendingId, tenantId, onSuccess],
  );

  return { pendingId, error, clearError: () => setError(null), toggle };
}
