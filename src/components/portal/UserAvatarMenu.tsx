'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/auth/useAuth';
import { GritIcon } from '@/components/ui';
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

  const initials = profile.nombre ? profile.nombre[0].toUpperCase() : '';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-grit-cyan transition-all hover:shadow-[0_0_12px_rgba(20,219,196,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"
        onClick={() => setOpen((prev) => !prev)}
      >
        {profile.foto_url ? (
          <Image
            src={profile.foto_url}
            alt={`${profile.nombre} ${profile.apellido}`}
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-grit-title text-sm font-bold text-grit-cyan">
            {initials || <GritIcon name="person" size={16} />}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 flex w-56 flex-col gap-1 overflow-hidden rounded-grit-lg border border-grit-glass-border bg-grit-bg/95 p-2 shadow-xl backdrop-blur-md"
        >
          <div className="border-b border-grit-glass-border px-3.5 pb-2.5 pt-1.5">
            <p className="truncate font-grit-body text-sm font-semibold text-grit-text">
              {profile.nombre} {profile.apellido}
            </p>
            <p className="truncate font-grit-body text-xs text-grit-subtext">{profile.email}</p>
          </div>
          <Link
            href="/portal/perfil"
            role="menuitem"
            className="flex items-center gap-3.5 rounded-grit-md px-3.5 py-2.5 font-grit-body text-sm font-medium text-grit-subtext transition-colors hover:bg-grit-cyan/10 hover:text-grit-text"
            onClick={() => setOpen(false)}
          >
            <GritIcon name="person" size={18} />
            Perfil
          </Link>
          <button
            role="menuitem"
            className="flex w-full items-center gap-3.5 rounded-grit-md px-3.5 py-2.5 font-grit-body text-sm font-medium text-grit-subtext transition-colors hover:bg-grit-danger/10 hover:text-grit-danger"
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
