'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UserAvatarMenu } from '@/components/portal/UserAvatarMenu';
import { PortalMobileDrawer, PORTAL_MOBILE_DRAWER_ID } from '@/components/portal/PortalMobileDrawer';
import { NotificacionesBell } from '@/components/portal/notificaciones';
import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import type { PortalDisplayProfile } from '@/types/portal.types';

type PortalHeaderProps = {
  profile: PortalDisplayProfile;
};

export function PortalHeader({ profile }: PortalHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The drawer is mounted on first open only, then kept so the slide-out can animate
  const [drawerMounted, setDrawerMounted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const openDrawer = () => {
    setDrawerMounted(true);
    setDrawerOpen(true);
  };
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <header className="relative z-20 flex flex-shrink-0 items-center justify-between border-b border-grit-glass-border bg-grit-bg/80 px-4 py-[18px] backdrop-blur-md sm:px-6 lg:px-12">
      {/* Left: logo — on desktop it lives in PortalSidebar (US-0138) */}
      <Link href="/portal" className="flex items-center lg:hidden">
        <div className="relative h-8 w-32">
          <Image src="/logo-navbar.png" alt="GRIT Arena" fill className="object-contain" />
        </div>
      </Link>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-3.5">
        <NotificacionesBell />
        <UserAvatarMenu profile={profile} />
        {/* Drawer opens from the right, so its trigger sits on the right (design AGzMs) */}
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          aria-controls={PORTAL_MOBILE_DRAWER_ID}
          onClick={openDrawer}
          className={cx(
            'flex h-[38px] w-[38px] items-center justify-center rounded-grit-md border border-grit-glass-border bg-grit-glass text-grit-text transition-colors hover:bg-grit-cyan/10 lg:hidden',
            gritFocusRing,
          )}
        >
          <GritIcon name="menu" size={18} />
        </button>
      </div>

      {drawerMounted && (
        <PortalMobileDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          profile={profile}
          returnFocusRef={menuButtonRef}
        />
      )}
    </header>
  );
}
