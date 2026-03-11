'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { asistenciasService } from '@/services/supabase/portal/asistencias.service';
import type { Asistencia, AsistenciaFormValues } from '@/types/portal/asistencias.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UseAsistenciasOptions = {
  tenantId: string;
  entrenamientoId: string | null;
  isEnabled: boolean; // false for athletes — skip fetching entirely
};

type UseAsistenciasResult = {
  asistenciaMap: Record<string, Asistencia>;
  isLoading: boolean;
  error: string | null;
  upsertAsistencia: (values: AsistenciaFormValues, reservaId: string) => Promise<boolean>;
  deleteAsistencia: (asistenciaId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAsistencias({
  tenantId,
  entrenamientoId,
  isEnabled,
}: UseAsistenciasOptions): UseAsistenciasResult {
  const [asistenciaMap, setAsistenciaMap] = useState<Record<string, Asistencia>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Resolve current user ID once on mount (only when enabled)
  useEffect(() => {
    if (!isEnabled) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, [isEnabled]);

  const loadAsistencias = useCallback(async () => {
    if (!isEnabled || !entrenamientoId) {
      setAsistenciaMap({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const map = await asistenciasService.getByEntrenamiento(tenantId, entrenamientoId);
      setAsistenciaMap(map);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'No fue posible cargar las asistencias.';
      setError(message);
      setAsistenciaMap({});
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, tenantId, entrenamientoId]);

  // Stable ref to avoid stale closure in the refresh exposed to callers
  const loadRef = useRef(loadAsistencias);
  loadRef.current = loadAsistencias;

  useEffect(() => {
    let cancelled = false;

    const execute = async () => {
      if (!cancelled) {
        await loadAsistencias();
      }
    };

    void execute();

    return () => {
      cancelled = true;
    };
  }, [loadAsistencias]);

  const refresh = useCallback(async () => {
    await loadRef.current();
  }, []);

  const upsertAsistencia = useCallback(
    async (values: AsistenciaFormValues, reservaId: string): Promise<boolean> => {
      if (!isEnabled || !currentUserId) return false;

      setError(null);

      try {
        await asistenciasService.upsert({
          tenant_id: tenantId,
          reserva_id: reservaId,
          validado_por: currentUserId,
          fecha_asistencia: new Date().toISOString(),
          asistio: values.asistio,
          observaciones: values.observaciones.trim() || null,
        });
        return true;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : 'No fue posible guardar la asistencia.';
        setError(message);
        return false;
      }
    },
    [isEnabled, tenantId, currentUserId],
  );

  const deleteAsistencia = useCallback(
    async (asistenciaId: string): Promise<boolean> => {
      if (!isEnabled) return false;

      setError(null);

      try {
        await asistenciasService.deleteById(tenantId, asistenciaId);
        return true;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : 'No fue posible eliminar la asistencia.';
        setError(message);
        return false;
      }
    },
    [isEnabled, tenantId],
  );

  return {
    asistenciaMap,
    isLoading,
    error,
    upsertAsistencia,
    deleteAsistencia,
    refresh,
  };
}
