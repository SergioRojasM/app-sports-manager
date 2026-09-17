'use client';

import { useCallback, useState } from 'react';
import { invitacionesService } from '@/services/supabase/portal/invitaciones.service';
import {
  InvitacionesServiceError,
  type AgregarMiembroInput,
  type AgregarMiembroModo,
} from '@/types/portal/invitaciones.types';

/** One-time reveal of a provisioned account. Cleared as soon as the reveal modal closes. */
export type AltaRevelada = {
  email: string;
  contrasenaTemporal: string;
};

type UseAgregarMiembroOptions = {
  tenantId: string;
};

type UseAgregarMiembroResult = {
  isSubmitting: boolean;
  error: string | null;
  resultadoAlta: AltaRevelada | null;
  /** Resolves to true on success; on failure sets `error` and resolves to false. */
  agregar: (modo: AgregarMiembroModo, input: AgregarMiembroInput) => Promise<boolean>;
  limpiarError: () => void;
  limpiarResultado: () => void;
};

export function useAgregarMiembro({ tenantId }: UseAgregarMiembroOptions): UseAgregarMiembroResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultadoAlta, setResultadoAlta] = useState<AltaRevelada | null>(null);

  const agregar = useCallback(
    async (modo: AgregarMiembroModo, input: AgregarMiembroInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        if (modo === 'contrasena_temporal') {
          const result = await invitacionesService.aprovisionarMiembro(tenantId, input);
          setResultadoAlta({ email: input.email.trim().toLowerCase(), contrasenaTemporal: result.contrasena_temporal });
        } else {
          await invitacionesService.crearInvitacion(tenantId, input);
        }
        return true;
      } catch (err) {
        setError(
          err instanceof InvitacionesServiceError ? err.message : 'No fue posible agregar al miembro.',
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tenantId],
  );

  const limpiarError = useCallback(() => setError(null), []);
  const limpiarResultado = useCallback(() => setResultadoAlta(null), []);

  return { isSubmitting, error, resultadoAlta, agregar, limpiarError, limpiarResultado };
}
