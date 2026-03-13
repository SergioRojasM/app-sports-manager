'use client';

import { useCallback, useEffect, useState } from 'react';
import { solicitudesService } from '@/services/supabase/portal/solicitudes.service';
import type { BloqueadoRow } from '@/types/portal/solicitudes.types';
import { SolicitudesServiceError } from '@/types/portal/solicitudes.types';

type UseBloqueadosOptions = {
  tenantId: string;
};

type UseBloqueadosResult = {
  bloqueados: BloqueadoRow[];
  loading: boolean;
  error: string | null;
  desbloquear: (usuarioId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useBloqueados({ tenantId }: UseBloqueadosOptions): UseBloqueadosResult {
  const [bloqueados, setBloqueados] = useState<BloqueadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await solicitudesService.getBloqueadosByTenant(tenantId);
      setBloqueados(data);
    } catch (err) {
      const msg =
        err instanceof SolicitudesServiceError
          ? err.message
          : 'Error al cargar los usuarios bloqueados.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const desbloquear = useCallback(
    async (usuarioId: string) => {
      await solicitudesService.desbloquearUsuario(tenantId, usuarioId);
      await loadData();
    },
    [tenantId, loadData],
  );

  return {
    bloqueados,
    loading,
    error,
    desbloquear,
    refresh: loadData,
  };
}
