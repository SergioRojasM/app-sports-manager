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
      <div className="flex h-16 items-center gap-3 border-b border-portal-border px-5">
        <div className="relative h-8 w-8">
          <Image src="/logo2.png" alt="qbop sports" fill className="object-contain" />
        </div>
        <span className="font-display text-base font-semibold text-slate-100">
          qbop <span className="text-turquoise">sports</span>
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <RoleBasedMenu menuItems={menuItems} activePath={activePath} />
      </div>
    </aside>
  );
}
