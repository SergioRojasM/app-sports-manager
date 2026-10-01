'use client';

import { useCallback, useState } from 'react';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import { EventoCompraServiceError } from '@/types/portal/eventos-compras.types';

type UseValidarCompraEventoOptions = {
  onSuccess: () => void;
};

/** Validate or reject an `en_validacion` purchase from the admin "Compras" page (US-0121). */
export function useValidarCompraEvento({ onSuccess }: UseValidarCompraEventoOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = useCallback(
    async (compraId: string, aprobar: boolean, motivo?: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await eventoComprasService.validarCompra(compraId, aprobar, motivo);
        onSuccess();
        return true;
      } catch (err) {
        if (!(err instanceof EventoCompraServiceError) || err.code === 'unknown') {
          console.error('useValidarCompraEvento: failed', err);
        }
        setError(err instanceof EventoCompraServiceError ? err.message : 'No se pudo completar la operación. Intenta de nuevo.');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess],
  );

  const validar = useCallback((compraId: string) => ejecutar(compraId, true), [ejecutar]);
  const rechazar = useCallback((compraId: string, motivo: string) => ejecutar(compraId, false, motivo), [ejecutar]);
  const resetError = useCallback(() => setError(null), []);

  return { isSubmitting, error, validar, rechazar, resetError };
}
