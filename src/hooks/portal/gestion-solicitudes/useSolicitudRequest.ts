'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { solicitudesService } from '@/services/supabase/portal/solicitudes.service';
import type { SolicitudRow } from '@/types/portal/solicitudes.types';
import { SolicitudesServiceError } from '@/types/portal/solicitudes.types';

type UseSolicitudRequestOptions = {
  tenantId: string;
};

type UseSolicitudRequestResult = {
  solicitudes: SolicitudRow[];
  loading: boolean;
  hasPending: boolean;
  rejectionCount: number;
  isBlocked: boolean;
  submit: (mensaje?: string) => Promise<void>;
  submitting: boolean;
};

export function useSolicitudRequest({ tenantId }: UseSolicitudRequestOptions): UseSolicitudRequestResult {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const userId = user?.id ?? '';

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await solicitudesService.getUserSolicitudesForTenant(tenantId, userId);
      setSolicitudes(data);
    } catch {
      // Silently fail — button renders default state
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasPending = solicitudes.some((s) => s.estado === 'pendiente');
  const rejectionCount = solicitudes.filter((s) => s.estado === 'rechazada').length;
  const isBlocked = rejectionCount >= 3;

  const submit = useCallback(
    async (mensaje?: string) => {
      if (!userId) return;
      setSubmitting(true);
      try {
        await solicitudesService.createSolicitud({
          tenant_id: tenantId,
          usuario_id: userId,
          mensaje,
        });
        await loadData();
      } catch (err) {
        const msg =
          err instanceof SolicitudesServiceError
            ? err.message
            : 'No fue posible enviar la solicitud.';
        throw new Error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [tenantId, userId, loadData],
  );

  return {
    solicitudes,
    loading,
    hasPending,
    rejectionCount,
    isBlocked,
    submit,
    submitting,
  };
}
