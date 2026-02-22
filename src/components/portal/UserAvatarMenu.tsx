'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/auth/useAuth';
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
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-turquoise/30 transition-all hover:border-turquoise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"
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
          <span className="font-display text-sm font-semibold text-turquoise">
            {initials || (
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                person
              </span>
            )}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-md border border-portal-border bg-navy-medium shadow-xl"
        >
          <div className="border-b border-portal-border px-4 py-2.5">
            <p className="truncate text-sm font-medium text-slate-100">
              {profile.nombre} {profile.apellido}
            </p>
            <p className="truncate text-xs text-slate-400">{profile.email}</p>
          </div>
          <Link
            href="/portal/perfil"
            role="menuitem"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-navy-soft hover:text-slate-100"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              person
            </span>
            Perfil
          </Link>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-navy-soft hover:text-red-400"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              logout
            </span>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
