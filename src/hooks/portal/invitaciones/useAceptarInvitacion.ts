'use client';

import { useCallback, useEffect, useState } from 'react';
import { invitacionesService } from '@/services/supabase/portal/invitaciones.service';
import {
  InvitacionesServiceError,
  type AceptarInvitacionResultado,
  type InvitacionesErrorCode,
  type InvitacionParaAceptar,
} from '@/types/portal/invitaciones.types';

type UseAceptarInvitacionResult = {
  invitacion: InvitacionParaAceptar | null;
  loading: boolean;
  loadErrorCode: InvitacionesErrorCode | null;
  isAccepting: boolean;
  acceptError: { code: InvitacionesErrorCode; message: string } | null;
  aceptar: () => Promise<AceptarInvitacionResultado | null>;
  reload: () => Promise<void>;
};

export function useAceptarInvitacion(invitacionId: string): UseAceptarInvitacionResult {
  const [invitacion, setInvitacion] = useState<InvitacionParaAceptar | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErrorCode, setLoadErrorCode] = useState<InvitacionesErrorCode | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<{ code: InvitacionesErrorCode; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErrorCode(null);
    try {
      setInvitacion(await invitacionesService.getInvitacionParaAceptar(invitacionId));
    } catch (err) {
      setInvitacion(null);
      setLoadErrorCode(err instanceof InvitacionesServiceError ? err.code : 'unexpected');
    } finally {
      setLoading(false);
    }
  }, [invitacionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const aceptar = useCallback(async () => {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      return await invitacionesService.aceptarInvitacion(invitacionId);
    } catch (err) {
      setAcceptError(
        err instanceof InvitacionesServiceError
          ? { code: err.code, message: err.message }
          : { code: 'unexpected', message: 'No fue posible aceptar la invitación.' },
      );
      return null;
    } finally {
      setIsAccepting(false);
    }
  }, [invitacionId]);

  return { invitacion, loading, loadErrorCode, isAccepting, acceptError, aceptar, reload: load };
}
