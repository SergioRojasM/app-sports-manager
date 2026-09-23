'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { analiticaService } from '@/services/supabase/portal/analitica.service';
import {
  AnaliticaServiceError,
  type AnaliticaDashboard,
  type AnaliticaDateRange,
} from '@/types/portal/analitica.types';

type UseAnaliticaOptions = {
  tenantId: string;
  dateRange: AnaliticaDateRange;
};

export function useAnalitica({ tenantId, dateRange }: UseAnaliticaOptions) {
  const [data, setData] = useState<AnaliticaDashboard | null>(null);
  const dataRef = useRef<AnaliticaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AnaliticaServiceError | null>(null);

  const refresh = useCallback(async () => {
    const isInitialLoad = dataRef.current === null;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const nextData = await analiticaService.fetchDashboard(tenantId, dateRange.dateFrom, dateRange.dateTo);
      dataRef.current = nextData;
      setData(nextData);
    } catch (caughtError) {
      setError(
        caughtError instanceof AnaliticaServiceError
          ? caughtError
          : new AnaliticaServiceError('unknown', 'No fue posible cargar la analítica.'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange.dateFrom, dateRange.dateTo, tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refreshing, error, refresh };
}