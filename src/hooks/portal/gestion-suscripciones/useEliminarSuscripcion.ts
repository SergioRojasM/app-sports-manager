'use client';

import { useCallback, useState } from 'react';
import { gestionSuscripcionesService } from '@/services/supabase/portal/gestion-suscripciones.service';
import { GestionSuscripcionesServiceError } from '@/types/portal/gestion-suscripciones.types';

type UseEliminarSuscripcionOptions = {
  onSuccess: () => void;
};

type UseEliminarSuscripcionResult = {
  isSubmitting: boolean;
  error: string | null;
  confirmar: (suscripcionId: string) => Promise<void>;
};

export function useEliminarSuscripcion({
  onSuccess,
}: UseEliminarSuscripcionOptions): UseEliminarSuscripcionResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = useCallback(
    async (suscripcionId: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await gestionSuscripcionesService.eliminarSuscripcion(suscripcionId);
        onSuccess();
      } catch (err) {
        const msg =
          err instanceof GestionSuscripcionesServiceError
            ? err.message
            : 'Error al eliminar la suscripción.';
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess],
  );

  return { isSubmitting, error, confirmar };
}
