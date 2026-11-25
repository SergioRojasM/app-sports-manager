'use client';

import { useCallback, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { EventoServiceError, type EventoEstado } from '@/types/portal/eventos.types';

type UseCambiarEstadoEventoOptions = {
  tenantId: string;
  eventoId: string;
  onSuccess: () => void;
};

type UseCambiarEstadoEventoResult = {
  isSubmitting: boolean;
  error: string | null;
  confirmar: (estado: EventoEstado) => Promise<void>;
};

export function useCambiarEstadoEvento({
  tenantId,
  eventoId,
  onSuccess,
}: UseCambiarEstadoEventoOptions): UseCambiarEstadoEventoResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = useCallback(
    async (estado: EventoEstado) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await eventosService.updateEstadoEvento(tenantId, eventoId, estado);
        onSuccess();
      } catch (err) {
        console.error('Failed to change evento estado:', err);
        setError(err instanceof EventoServiceError ? err.message : 'No se pudo cambiar el estado del evento.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [tenantId, eventoId, onSuccess],
  );

  return { isSubmitting, error, confirmar };
}
