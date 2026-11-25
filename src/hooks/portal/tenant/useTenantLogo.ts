'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';

export type TenantLogoInfo = {
  nombre: string;
  logoUrl: string | null;
};

/**
 * Fetches only `nombre`/`logo_url` for a tenant — the minimal identity needed by the form
 * template header (US-0108). Mirrors `useTenantName`'s lightweight, single-purpose pattern.
 * Returns null while loading or if tenantId is not provided.
 */
export function useTenantLogo(tenantId?: string): TenantLogoInfo | null {
  const supabase = useMemo(() => createClient(), []);
  const [info, setInfo] = useState<TenantLogoInfo | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setInfo(null);
      return;
    }

    let cancelled = false;

    supabase
      .from('tenants')
      .select('nombre, logo_url')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) {
          const row = data as { nombre: string; logo_url: string | null };
          setInfo({ nombre: row.nombre, logoUrl: row.logo_url });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId]);

  return info;
}
