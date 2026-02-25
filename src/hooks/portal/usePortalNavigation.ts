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
  const { role: tenantRole } = useTenantAccess(tenantId);
  const effectiveRole = tenantRole ?? role;

  const menuItems = useMemo(
    () => resolvePortalMenu(effectiveRole, tenantId),
    [effectiveRole, tenantId],
  );

  return { activePath, menuItems };
}
