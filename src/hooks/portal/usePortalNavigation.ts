'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { UserRole, MenuItem } from '@/types/portal.types';
import { resolvePortalMenu } from '@/types/portal.types';
import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';

type UsePortalNavigationResult = {
  activePath: string;
  menuItems: MenuItem[];
};

export function usePortalNavigation(role: UserRole): UsePortalNavigationResult {
  const activePath = usePathname();
  const tenantId = useMemo(() => {
    const match = activePath.match(/^\/portal\/orgs\/([^/]+)/);
    return match?.[1];
  }, [activePath]);
  const { loading: tenantAccessLoading, allowed: tenantAllowed, role: tenantRole } = useTenantAccess(tenantId);
  const effectiveRole = tenantRole ?? role;

  const menuItems = useMemo(
    () => {
      if (!tenantId) {
        return resolvePortalMenu(effectiveRole, undefined);
      }

      if (tenantAccessLoading || !tenantAllowed || !tenantRole) {
        return resolvePortalMenu(effectiveRole, undefined);
      }

      return resolvePortalMenu(tenantRole, tenantId);
    },
    [effectiveRole, tenantAccessLoading, tenantAllowed, tenantId, tenantRole],
  );

  return { activePath, menuItems };
}
