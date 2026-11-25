'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { invitacionesService } from '@/services/supabase/portal/invitaciones.service';
import {
  InvitacionesServiceError,
  type InvitacionesFiltro,
  type InvitacionRow,
} from '@/types/portal/invitaciones.types';

type UseInvitacionesAdminOptions = {
  tenantId: string;
};

type UseInvitacionesAdminResult = {
  invitaciones: InvitacionRow[];
  loading: boolean;
  error: string | null;
  filtro: InvitacionesFiltro;
  setFiltro: (filtro: InvitacionesFiltro) => void;
  activeCount: number;
  reenviar: (invitacion: InvitacionRow) => Promise<void>;
  cancelar: (invitacion: InvitacionRow) => Promise<void>;
  refresh: () => Promise<void>;
};

const ACTIVE_STATES = new Set(['pendiente', 'enviada']);

function toMessage(err: unknown, fallback: string): string {
  return err instanceof InvitacionesServiceError ? err.message : fallback;
}

export function useInvitacionesAdmin({ tenantId }: UseInvitacionesAdminOptions): UseInvitacionesAdminResult {
  const [all, setAll] = useState<InvitacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<InvitacionesFiltro>('activas');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAll(await invitacionesService.getInvitacionesAdmin(tenantId, 'todas'));
    } catch (err) {
      setError(toMessage(err, 'Error al cargar las invitaciones.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const invitaciones = useMemo(() => {
    if (filtro === 'todas') return all;
    if (filtro === 'activas' || filtro === 'pendiente' || filtro === 'enviada') {
      return all.filter((inv) => ACTIVE_STATES.has(inv.estado));
    }
    return all.filter((inv) => inv.estado === filtro);
  }, [all, filtro]);

  const activeCount = useMemo(() => all.filter((inv) => ACTIVE_STATES.has(inv.estado)).length, [all]);

  const reenviar = useCallback(
    async (invitacion: InvitacionRow) => {
      await invitacionesService.reenviarInvitacion(tenantId, invitacion.id);
      await loadData();
    },
    [tenantId, loadData],
  );

  const cancelar = useCallback(
    async (invitacion: InvitacionRow) => {
      await invitacionesService.cancelarInvitacion(invitacion.id);
      await loadData();
    },
    [loadData],
  );

  return {
    invitaciones,
    loading,
    error,
    filtro,
    setFiltro,
    activeCount,
    reenviar,
    cancelar,
    refresh: loadData,
  };
}
