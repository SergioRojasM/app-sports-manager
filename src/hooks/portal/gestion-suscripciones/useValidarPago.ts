'use client';

import { useCallback, useState } from 'react';
import { gestionSuscripcionesService } from '@/services/supabase/portal/gestion-suscripciones.service';
import { GestionSuscripcionesServiceError } from '@/types/portal/gestion-suscripciones.types';
import type { PagoEstado } from '@/types/portal/gestion-suscripciones.types';

type UseValidarPagoOptions = {
  onSuccess: () => void;
};

type UseValidarPagoResult = {
  isSubmitting: boolean;
  error: string | null;
  approve: (pagoId: string, validadoPor: string) => Promise<void>;
  reject: (pagoId: string) => Promise<void>;
};

export function useValidarPago({ onSuccess }: UseValidarPagoOptions): UseValidarPagoResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (pagoId: string, estado: Extract<PagoEstado, 'validado' | 'rechazado'>, validadoPor?: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await gestionSuscripcionesService.updatePagoEstado(pagoId, estado, validadoPor ?? '');
        onSuccess();
      } catch (err) {
        const msg =
          err instanceof GestionSuscripcionesServiceError
            ? err.message
            : 'Error al actualizar el pago.';
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess],
  );

  const approve = useCallback(
    async (pagoId: string, validadoPor: string) => {
      await mutate(pagoId, 'validado', validadoPor);
    },
    [mutate],
  );

  const reject = useCallback(
    async (pagoId: string) => {
      await mutate(pagoId, 'rechazado');
    },
    [mutate],
  );

  return { isSubmitting, error, approve, reject };
}
