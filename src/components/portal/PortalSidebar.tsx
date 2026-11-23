'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PortalNavContent } from '@/components/portal/PortalNavContent';
import { PortalSidebarUser } from '@/components/portal/PortalSidebarUser';
import { usePortalNavigationContext } from '@/components/portal/PortalNavigationProvider';
import type { PortalDisplayProfile } from '@/types/portal.types';

type PortalSidebarProps = {
  profile: PortalDisplayProfile;
};

/** Persistent desktop navigation (≥1024px), floating v3 sidebar `Vl7zI` / `N3E8S` (US-0138, v3 US-0141). */
export function PortalSidebar({ profile }: PortalSidebarProps) {
  const nav = usePortalNavigationContext();

  return (
    <aside
      aria-label="Navegación principal"
      className="hidden h-full w-[240px] shrink-0 flex-col gap-[18px] rounded-grit-3xl border border-white/[0.10] bg-gradient-to-b from-grit-surface to-grit-sidebar px-3.5 pb-4 pt-[26px] shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] lg:flex"
    >
      <Link href="/portal" className="flex items-center rounded-grit-sm px-2">
        <div className="relative h-[38px] w-[132px]">
          <Image src="/logo-grit-arena-dark.png" alt="GRIT Arena" fill className="object-contain object-left" priority />
        </div>
      </Link>

      {/* Only the navigation scrolls; logo and user footer stay anchored */}
      <div className="grit-scrollbar -mr-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
        <PortalNavContent variant="sidebar" nav={nav} />
      </div>

      <PortalSidebarUser profile={profile} tenantRole={nav.tenantNav?.role ?? null} />
    </aside>
  );
}
