'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { MenuItem, PortalNavGroupId, ResolvedNavNode, UserRole } from '@/types/portal.types';
import { findActiveHref, resolveGlobalMenu, resolveTenantNav } from '@/types/portal.types';
import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import { useTenantNameState } from '@/hooks/portal/tenant/useTenantName';

export type PortalTenantNav = {
  tenantId: string;
  /** Null while loading or when the name could not be read. */
  tenantName: string | null;
  tenantNameLoading: boolean;
  role: UserRole;
  nodes: ResolvedNavNode[];
};

export type UsePortalNavigationResult = {
  activePath: string;
  activeHref: string | null;
  globalItems: MenuItem[];
  /** Null outside a tenant or when access to it is denied. */
  tenantNav: PortalTenantNav | null;
  tenantLoading: boolean;
  activeGroupId: PortalNavGroupId | null;
};

const GLOBAL_ITEMS = resolveGlobalMenu();

export function usePortalNavigation(): UsePortalNavigationResult {
  const activePath = usePathname();
  const tenantId = useMemo(() => {
    const match = activePath.match(/^\/portal\/orgs\/([^/]+)/);
    return match?.[1];
  }, [activePath]);

  const { loading: tenantLoading, allowed, role: tenantRole } = useTenantAccess(tenantId);
  // The menu never reads tenants.logo_url — only the name (US-0138)
  const { name: tenantName, loading: tenantNameLoading } = useTenantNameState(tenantId);

  const tenantNav = useMemo((): PortalTenantNav | null => {
    if (!tenantId || tenantLoading || !allowed || !tenantRole) {
      return null;
    }
    return {
      tenantId,
      tenantName,
      tenantNameLoading,
      role: tenantRole,
      nodes: resolveTenantNav(tenantRole, tenantId),
    };
  }, [allowed, tenantId, tenantLoading, tenantName, tenantNameLoading, tenantRole]);

  const { activeHref, activeGroupId } = useMemo(() => {
    const leafHrefs = (tenantNav?.nodes ?? []).flatMap((node) =>
      node.kind === 'group' ? node.children.map((child) => child.href) : [node.href],
    );
    const href = findActiveHref(activePath, [...GLOBAL_ITEMS.map((item) => item.href), ...leafHrefs]);
    const group = tenantNav?.nodes.find(
      (node) => node.kind === 'group' && node.children.some((child) => child.href === href),
    );
    return {
      activeHref: href,
      activeGroupId: group?.kind === 'group' ? group.id : null,
    };
  }, [activePath, tenantNav]);

  return {
    activePath,
    activeHref,
    globalItems: GLOBAL_ITEMS,
    tenantNav,
    tenantLoading,
    activeGroupId,
  };
}
