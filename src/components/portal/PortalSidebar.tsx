'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GritDivider } from '@/components/ui';
import { PortalNavContent } from '@/components/portal/PortalNavContent';
import { PortalSidebarUser } from '@/components/portal/PortalSidebarUser';
import { usePortalNavigationContext } from '@/components/portal/PortalNavigationProvider';
import type { PortalDisplayProfile } from '@/types/portal.types';

type PortalSidebarProps = {
  profile: PortalDisplayProfile;
};

/** Persistent desktop navigation (≥1024px), design E73seM (US-0138). */
export function PortalSidebar({ profile }: PortalSidebarProps) {
  const nav = usePortalNavigationContext();

  return (
    <aside
      aria-label="Navegación principal"
      className="hidden h-full w-[280px] shrink-0 flex-col gap-5 border-r border-grit-glass-border bg-grit-sidebar px-4 pb-5 pt-7 lg:flex"
    >
      <Link href="/portal" className="flex items-center px-2">
        <div className="relative h-8 w-32">
          <Image src="/logo-navbar.png" alt="GRIT Arena" fill className="object-contain object-left" />
        </div>
      </Link>

      {/* Only the navigation scrolls; logo and user footer stay anchored */}
      <div className="grit-scrollbar -mr-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
        <PortalNavContent variant="sidebar" nav={nav} />
      </div>

      <GritDivider />
      <PortalSidebarUser profile={profile} tenantRole={nav.tenantNav?.role ?? null} />
    </aside>
  );
}
