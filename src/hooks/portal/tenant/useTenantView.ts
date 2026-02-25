'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { tenantService } from '@/services/supabase/portal/tenant.service';
import type {
  PortalTenantListItem,
  TenantViewData,
  TenantViewState,
} from '@/types/portal/tenant.types';

type UseTenantViewMode = 'tenant' | 'directory';

type UseTenantViewOptions = {
  mode?: UseTenantViewMode;
  tenantId?: string;
};

type UseTenantViewResult = TenantViewState & {
  tenants: PortalTenantListItem[];
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useTenantView(options: UseTenantViewOptions = {}): UseTenantViewResult {
  const mode = options.mode ?? 'tenant';
  const tenantId = options.tenantId;
  const [data, setData] = useState<TenantViewData | null>(null);
  const [tenants, setTenants] = useState<PortalTenantListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const mapped = tenantService.mapError(new Error('No active session'));
      setData(null);
      setError(mapped.message);
      setLoading(false);
      return;
    }

    try {
      if (mode === 'directory') {
        const [tenants, memberships] = await Promise.all([
          tenantService.listVisibleTenantsForPortal(supabase),
          tenantService.listUserTenantMemberships(supabase, user.id),
        ]);

        setTenants(tenantService.mapPortalTenants(tenants, memberships));
        setData(null);
      } else {
        if (!tenantId) {
          throw new Error('Tenant context missing');
        }

        const payload = await tenantService.fetchTenantViewData(supabase, user.id, tenantId);
        setData(payload);
        setTenants([]);
      }
    } catch (unknownError) {
      const mapped = tenantService.mapError(unknownError);
      setData(null);
      setTenants([]);
      setError(mapped.message);
    } finally {
      setLoading(false);
    }
  }, [mode, supabase, tenantId]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await load();
    };

    execute();

    return () => {
      mounted = false;
    };
  }, [load]);

  return {
    data,
    tenants,
    loading,
    error,
    retry: load,
    refresh: load,
  };
}
