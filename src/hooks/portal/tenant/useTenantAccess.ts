'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { tenantService } from '@/services/supabase/portal/tenant.service';
import type { UserRole } from '@/types/portal.types';

type TenantAccessState = {
  loading: boolean;
  allowed: boolean;
  role: UserRole | null;
};

export function useTenantAccess(tenantId?: string): TenantAccessState {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<TenantAccessState>({
    loading: Boolean(tenantId),
    allowed: false,
    role: null,
  });

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let cancelled = false;

    const resolveAccess = async () => {
      setState({ loading: true, allowed: false, role: null });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setState({ loading: false, allowed: false, role: null });
        }
        return;
      }

      try {
        const decision = await tenantService.canUserAccessTenant(supabase, user.id, tenantId);

        if (!cancelled) {
          setState({
            loading: false,
            allowed: decision.allowed,
            role: decision.role,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ loading: false, allowed: false, role: null });
        }
      }
    };

    void resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId]);

  if (!tenantId) {
    return { loading: false, allowed: false, role: null };
  }

  return state;
}
