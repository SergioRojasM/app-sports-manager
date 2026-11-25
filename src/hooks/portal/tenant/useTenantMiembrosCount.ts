'use client';

import { useEffect, useState } from 'react';
import { tenantService } from '@/services/supabase/portal/tenant.service';

type UseTenantMiembrosCountResult = {
  /** null while loading or when the count failed (the tile then shows "—"). */
  count: number | null;
  loading: boolean;
};

/** Member count for the organization identity card (`aYwNn` "Miembros" tile). Never throws. */
export function useTenantMiembrosCount(tenantId: string): UseTenantMiembrosCountResult {
  const [state, setState] = useState<UseTenantMiembrosCountResult>({ count: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    tenantService
      .countMiembros(tenantId)
      .then((count) => {
        if (!cancelled) setState({ count, loading: false });
      })
      .catch((error: unknown) => {
        console.error('[useTenantMiembrosCount]', error);
        if (!cancelled) setState({ count: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return state;
}
