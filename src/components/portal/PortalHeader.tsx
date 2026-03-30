'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserAvatarMenu } from '@/components/portal/UserAvatarMenu';
import { PortalNavMenu } from '@/components/portal/PortalNavMenu';
import type { PortalDisplayProfile, UserRole } from '@/types/portal.types';
import { PortalBreadcrumb } from '@/components/portal/PortalBreadcrumb';

type PortalHeaderProps = {
  profile: PortalDisplayProfile;
  role: UserRole;
};

export function PortalHeader({ profile, role }: PortalHeaderProps) {
  return (
    <header className="relative z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-portal-border bg-navy-deep/95 px-6 backdrop-blur-md">
      {/* Left: logo + nav menu */}
      <div className="flex items-center gap-4">
        <Link href="/portal" className="flex items-center gap-2.5">
          <div className="relative h-8 w-8">
            <Image src="/icono_2.png" alt="qbop sports" fill className="object-contain" />
          </div>
          <span className="font-display text-sm font-semibold text-slate-100">
            GRIT <span className="text-turquoise"> Arena</span>
          </span>
        </Link>
        <div className="h-5 w-px bg-portal-border" />
        <PortalNavMenu role={role} />
        {/* Breadcrumb — hidden on mobile to keep avatar/notifications accessible */}
        <div className="hidden md:flex items-center gap-2">
          <div className="h-5 w-px bg-portal-border" />
          <PortalBreadcrumb />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          aria-label="Notificaciones"
          className="relative flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-slate-400 transition-colors hover:text-turquoise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            notifications
          </span>
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-turquoise"
          />
        </button>

        {/* Avatar */}
        <UserAvatarMenu profile={profile} />
      </div>
    </header>
  );
}
