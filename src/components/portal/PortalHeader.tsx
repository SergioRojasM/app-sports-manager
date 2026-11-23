'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UserAvatarMenu } from '@/components/portal/UserAvatarMenu';
import { PortalMobileDrawer, PORTAL_MOBILE_DRAWER_ID } from '@/components/portal/PortalMobileDrawer';
import { NotificacionesBell } from '@/components/portal/notificaciones';
import { PortalBreadcrumb } from '@/components/portal/PortalBreadcrumb';
import { GritIconButton } from '@/components/ui';
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
    // v3 Topbar (`vwVLa`): transparent, borderless, 56px; it sits outside the scrolling <main> (US-0141)
    <header className="relative z-20 flex h-14 flex-shrink-0 items-center gap-3.5 px-4 sm:px-6 lg:px-8">
      {/* Left: breadcrumb on desktop; below 1024px the logo (the breadcrumb renders inside <main>) */}
      <div className="hidden min-w-0 flex-1 lg:flex">
        <PortalBreadcrumb variant="topbar" />
      </div>
      <Link href="/portal" className="flex items-center lg:hidden">
        <div className="relative h-8 w-28">
          <Image src="/logo-grit-arena-dark.png" alt="GRIT Arena" fill className="object-contain object-left" />
        </div>
      </Link>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-3.5">
        <NotificacionesBell />
        <UserAvatarMenu profile={profile} />
        {/* Drawer opens from the right, so its trigger sits on the right (design AGzMs) */}
        <GritIconButton
          ref={menuButtonRef}
          icon="menu"
          label="Abrir menú"
          aria-expanded={drawerOpen}
          aria-controls={PORTAL_MOBILE_DRAWER_ID}
          onClick={openDrawer}
          className="lg:hidden"
        />
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
