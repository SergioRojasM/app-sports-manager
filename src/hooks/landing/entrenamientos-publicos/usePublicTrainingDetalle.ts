'use client';

import { useCallback, useEffect, useState } from 'react';
import { entrenamientosPublicosService } from '@/services/supabase/portal/entrenamientos-publicos.service';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

/**
 * Loads one published public training for the detail page (US-0109).
 *
 * "Not found" and "fetch failed" are deliberately distinct outcomes: a missing
 * row settles as `item === null` with `error === null`, while a network/Supabase
 * failure sets `error`. The page renders a different state for each, so a
 * transient outage never masquerades as a deleted training.
 */
export function usePublicTrainingDetalle(entrenamientoId: string) {
  const [item, setItem] = useState<PublicTrainingListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const detail = await entrenamientosPublicosService.getPublicTrainingDetail(entrenamientoId);
      setItem(detail);
    } catch {
      setItem(null);
      setError('No fue posible cargar este entrenamiento.');
    } finally {
      setLoading(false);
    }
  }, [entrenamientoId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    item,
    loading,
    error,
    refetch: load,
  };
}
