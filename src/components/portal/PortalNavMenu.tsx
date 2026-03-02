'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePortalNavigation } from '@/hooks/portal/usePortalNavigation';
import type { UserRole } from '@/types/portal.types';

type PortalNavMenuProps = {
  role: UserRole;
};

export function PortalNavMenu({ role }: PortalNavMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { activePath, menuItems } = usePortalNavigation(role);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de navegación"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-navy-soft hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="material-symbols-outlined text-[20px] text-turquoise" aria-hidden="true">
          grid_view
        </span>
        <span className="hidden sm:inline">Menú</span>
        <span
          className={`material-symbols-outlined text-[16px] text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-portal-border bg-navy-medium shadow-xl"
        >
          {menuItems.map((item) => {
            const isActive =
              activePath === item.href || activePath.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-turquoise/10 text-turquoise'
                    : 'text-slate-300 hover:bg-navy-soft hover:text-slate-100',
                ].join(' ')}
                onClick={() => setOpen(false)}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${isActive ? 'text-turquoise' : 'text-slate-500'}`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-turquoise"
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
