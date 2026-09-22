'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserAvatarMenu } from '@/components/portal/UserAvatarMenu';
import { PortalNavMenu } from '@/components/portal/PortalNavMenu';
import { GritIcon } from '@/components/ui';
import type { PortalDisplayProfile, UserRole } from '@/types/portal.types';

type PortalHeaderProps = {
  profile: PortalDisplayProfile;
  role: UserRole;
};

export function PortalHeader({ profile, role }: PortalHeaderProps) {
  return (
    <header className="relative z-20 flex flex-shrink-0 items-center justify-between border-b border-grit-glass-border bg-grit-bg/80 px-4 py-[18px] backdrop-blur-md sm:px-6 lg:px-12">
      {/* Left: logo + nav menu */}
      <div className="flex items-center gap-4">
        <Link href="/portal" className="flex items-center">
          <div className="relative h-8 w-32">
            <Image src="/logo-navbar.png" alt="GRIT Arena" fill className="object-contain" />
          </div>
        </Link>
        <div className="h-5 w-px bg-grit-glass-border" />
        <PortalNavMenu role={role} />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3.5">
        {/* Notifications */}
        <button
          aria-label="Notificaciones"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-grit-glass-border bg-grit-glass text-grit-subtext transition-colors hover:text-grit-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"
        >
          <GritIcon name="notifications" size={16} />
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-grit-cyan"
          />
        </button>

        {/* Avatar */}
        <UserAvatarMenu profile={profile} />
      </div>
    </header>
  );
}
