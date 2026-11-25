'use client';

import { useCallback, useState } from 'react';
import { authService } from '@/services/supabase/auth';
import { invitacionesService } from '@/services/supabase/portal/invitaciones.service';
import { InvitacionesServiceError } from '@/types/portal/invitaciones.types';

export const MIN_PASSWORD_LENGTH = 8;

type UseActivarCuentaResult = {
  isSubmitting: boolean;
  error: string | null;
  /** Resolves to true once the password changed and the membership was activated. */
  activar: (password: string, confirmacion: string) => Promise<boolean>;
};

export function useActivarCuenta(tenantId: string): UseActivarCuentaResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activar = useCallback(
    async (password: string, confirmacion: string) => {
      setError(null);

      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
        return false;
      }
      if (password !== confirmacion) {
        setError('Las contraseñas no coinciden.');
        return false;
      }

      setIsSubmitting(true);
      try {
        const { errorMessage } = await authService.updatePassword(password);
        if (errorMessage) {
          setError('No fue posible actualizar tu contraseña. Intenta con una diferente.');
          return false;
        }

        await invitacionesService.activarAltaAdministrada(tenantId);
        return true;
      } catch (err) {
        setError(
          err instanceof InvitacionesServiceError && err.code === 'not_found'
            ? 'Tu cuenta ya está activa o no tiene una activación pendiente en esta organización.'
            : 'Tu contraseña se actualizó, pero no pudimos activar tu membresía. Intenta de nuevo.',
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tenantId],
  );

  return { isSubmitting, error, activar };
}
