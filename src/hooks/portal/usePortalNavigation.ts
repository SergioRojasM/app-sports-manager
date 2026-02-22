'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { UserRole, MenuItem } from '@/types/portal.types';
import { ROLE_MENU_CONFIG } from '@/types/portal.types';

type UsePortalNavigationResult = {
  activePath: string;
  menuItems: MenuItem[];
};

export function usePortalNavigation(role: UserRole): UsePortalNavigationResult {
  const activePath = usePathname();

  const menuItems = useMemo(
    () => ROLE_MENU_CONFIG[role] ?? [],
    [role],
  );

  return { activePath, menuItems };
}
