'use client';

import { useCallback, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { EventoServiceError } from '@/types/portal/eventos.types';

type UseEliminarEventoOptions = {
  tenantId: string;
  onSuccess: () => void;
};

type UseEliminarEventoResult = {
  isSubmitting: boolean;
  error: string | null;
  confirmar: (eventoId: string) => Promise<void>;
};

export function useEliminarEvento({ tenantId, onSuccess }: UseEliminarEventoOptions): UseEliminarEventoResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = useCallback(
    async (eventoId: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await eventosService.deleteEvento(tenantId, eventoId);
        onSuccess();
      } catch (err) {
        console.error('Failed to delete evento:', err);
        setError(err instanceof EventoServiceError ? err.message : 'No se pudo eliminar el evento.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [tenantId, onSuccess],
  );

  return { isSubmitting, error, confirmar };
}
