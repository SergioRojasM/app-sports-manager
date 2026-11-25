'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { tenantService } from '@/services/supabase/portal/tenant.service';
import type { AdminTenantEntitlements } from '@/types/portal/tenant.types';

type UseTenantEntitlementsResult = {
  entitlements: AdminTenantEntitlements;
  loading: boolean;
};

const DISABLED: AdminTenantEntitlements = { aprovisionamientoAdministradoHabilitado: false };

/** Fails closed: any error leaves every entitlement disabled. */
export function useTenantEntitlements({ tenantId }: { tenantId: string }): UseTenantEntitlementsResult {
  const supabase = useMemo(() => createClient(), []);
  const [entitlements, setEntitlements] = useState<AdminTenantEntitlements>(DISABLED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    tenantService
      .getTenantEntitlements(supabase, tenantId)
      .then((result) => {
        if (!cancelled) setEntitlements(result);
      })
      .catch(() => {
        if (!cancelled) setEntitlements(DISABLED);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId]);

  return { entitlements, loading };
}
