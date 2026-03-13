'use client';

import { useCallback, useEffect, useState } from 'react';
import { solicitudesService } from '@/services/supabase/portal/solicitudes.service';
import type { SolicitudRow } from '@/types/portal/solicitudes.types';
import { SolicitudesServiceError } from '@/types/portal/solicitudes.types';

type UseSolicitudesAdminOptions = {
  tenantId: string;
};

type UseSolicitudesAdminResult = {
  solicitudes: SolicitudRow[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
  aceptar: (solicitud: SolicitudRow, rolId: string, revisadoPor: string) => Promise<void>;
  rechazar: (solicitud: SolicitudRow, revisadoPor: string, notaRevision?: string) => Promise<void>;
  bloquear: (solicitud: SolicitudRow, revisadoPor: string, motivo?: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useSolicitudesAdmin({ tenantId }: UseSolicitudesAdminOptions): UseSolicitudesAdminResult {
  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await solicitudesService.getSolicitudesByTenant(tenantId, 'pendiente');
      setSolicitudes(data);
    } catch (err) {
      const msg =
        err instanceof SolicitudesServiceError
          ? err.message
          : 'Error al cargar las solicitudes.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const aceptar = useCallback(
    async (solicitud: SolicitudRow, rolId: string, revisadoPor: string) => {
      await solicitudesService.aceptarSolicitud({
        solicitud_id: solicitud.id,
        tenant_id: solicitud.tenant_id,
        usuario_id: solicitud.usuario_id,
        rol_id: rolId,
        revisado_por: revisadoPor,
      });
      await loadData();
    },
    [loadData],
  );

  const rechazar = useCallback(
    async (solicitud: SolicitudRow, revisadoPor: string, notaRevision?: string) => {
      await solicitudesService.rechazarSolicitud({
        solicitud_id: solicitud.id,
        tenant_id: solicitud.tenant_id,
        usuario_id: solicitud.usuario_id,
        revisado_por: revisadoPor,
        nota_revision: notaRevision,
      });
      await loadData();
    },
    [loadData],
  );

  const bloquear = useCallback(
    async (solicitud: SolicitudRow, revisadoPor: string, motivo?: string) => {
      if (solicitud.estado === 'pendiente') {
        await solicitudesService.rechazarSolicitud({
          solicitud_id: solicitud.id,
          tenant_id: solicitud.tenant_id,
          usuario_id: solicitud.usuario_id,
          revisado_por: revisadoPor,
          nota_revision: motivo ?? 'Bloqueado por administrador',
        });
      }
      await solicitudesService.bloquearUsuario({
        tenant_id: solicitud.tenant_id,
        usuario_id: solicitud.usuario_id,
        bloqueado_por: revisadoPor,
        motivo,
      });
      await loadData();
    },
    [loadData],
  );

  return {
    solicitudes,
    loading,
    error,
    pendingCount: solicitudes.length,
    aceptar,
    rechazar,
    bloquear,
    refresh: loadData,
  };
}
