'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';

type TenantNameState = {
  name: string | null;
  /** True until the lookup settles (success or failure). */
  loading: boolean;
};

/**
 * Fetches only the `nombre` field of a tenant, exposing whether the lookup is
 * still pending so callers can tell "loading" apart from "not available".
 */
export function useTenantNameState(tenantId?: string): TenantNameState {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<TenantNameState & { tenantId?: string }>({
    name: null,
    loading: Boolean(tenantId),
    tenantId,
  });

  // Reset synchronously when the tenant changes so a stale name is never shown
  if (state.tenantId !== tenantId) {
    setState({ name: null, loading: Boolean(tenantId), tenantId });
  }

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let cancelled = false;

    supabase
      .from('tenants')
      .select('nombre')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setState({ name: (data as { nombre: string } | null)?.nombre ?? null, loading: false, tenantId });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId]);

  return { name: state.name, loading: state.loading };
}

/**
 * Fetches only the `nombre` field of a tenant.
 * Returns null while loading or if tenantId is not provided.
 */
export function useTenantName(tenantId?: string): string | null {
  return useTenantNameState(tenantId).name;
}
