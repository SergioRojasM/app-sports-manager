'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';

/**
 * Fetches only the `nombre` field of a tenant.
 * Returns null while loading or if tenantId is not provided.
 */
export function useTenantName(tenantId?: string): string | null {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setName(null);
      return;
    }

    let cancelled = false;

    supabase
      .from('tenants')
      .select('nombre')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) {
          setName((data as { nombre: string }).nombre);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId]);

  return name;
}
