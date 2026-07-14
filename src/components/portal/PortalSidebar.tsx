'use client';

import { usePortalNavigation } from '@/hooks/portal/usePortalNavigation';
import { RoleBasedMenu } from '@/components/portal/RoleBasedMenu';
import type { UserRole } from '@/types/portal.types';
import Image from 'next/image';

type PortalSidebarProps = {
  role: UserRole;
};

export function PortalSidebar({ role }: PortalSidebarProps) {
  const { activePath, menuItems } = usePortalNavigation(role);

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-portal-border bg-navy-deep">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-portal-border px-5">
        <div className="relative h-8 w-32">
          <Image src="/logo-navbar.png" alt="GRIT Arena" fill className="object-contain" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <RoleBasedMenu menuItems={menuItems} activePath={activePath} />
      </div>
    </aside>
  );
}
