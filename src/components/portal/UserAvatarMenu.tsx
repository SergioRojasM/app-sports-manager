'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/auth/useAuth';
import { GritAvatar, GritIcon, cx, gritFocusRing } from '@/components/ui';
import type { PortalDisplayProfile } from '@/types/portal.types';

type UserAvatarMenuProps = {
  profile: PortalDisplayProfile;
};

export function UserAvatarMenu({ profile }: UserAvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { signOut } = useAuth();

  // Close on click-outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* v3 Avatar / Topbar (`gNnuk`): 38px solid-cyan circle with dark initials or the photo (US-0141) */}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
        className={cx('rounded-full transition-shadow hover:shadow-[0_0_12px_rgba(20,219,196,0.35)]', gritFocusRing)}
        onClick={() => setOpen((prev) => !prev)}
      >
        <GritAvatar name={`${profile.nombre ?? ''} ${profile.apellido ?? ''}`} src={profile.foto_url} size={38} tone="solid" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 flex w-56 flex-col gap-1 overflow-hidden rounded-[18px] border border-white/[0.10] bg-grit-glass p-2 shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
        >
          <div className="border-b border-white/[0.06] px-3.5 pb-2.5 pt-1.5">
            <p className="truncate font-grit-body text-sm font-semibold text-grit-text">
              {profile.nombre} {profile.apellido}
            </p>
            <p className="truncate font-grit-body text-xs text-grit-subtext">{profile.email}</p>
          </div>
          <Link
            href="/portal/perfil"
            role="menuitem"
            className="flex items-center gap-3 rounded-full px-3.5 py-2.5 font-grit-body text-[13px] font-medium text-grit-subtext transition-colors hover:bg-white/[0.04] hover:text-grit-text"
            onClick={() => setOpen(false)}
          >
            <GritIcon name="person" size={18} />
            Perfil
          </Link>
          <button
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 font-grit-body text-[13px] font-medium text-grit-subtext transition-colors hover:bg-grit-danger/10 hover:text-grit-danger"
            onClick={handleLogout}
          >
            <GritIcon name="logout" size={18} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
