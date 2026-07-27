'use client';

import { useCallback, useEffect, useState } from 'react';
import { entrenamientosPublicosService } from '@/services/supabase/portal/entrenamientos-publicos.service';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

export function usePublicEntrenamientosLanding() {
  const [items, setItems] = useState<PublicTrainingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const trainings = await entrenamientosPublicosService.listPublicTrainingsForLanding();
      setItems(trainings);
    } catch {
      setItems([]);
      setError('No fue posible cargar los entrenamientos públicos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    loading,
    error,
    refetch: load,
  };
}
