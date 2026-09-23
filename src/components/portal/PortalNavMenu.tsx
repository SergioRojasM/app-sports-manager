'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePortalNavigation } from '@/hooks/portal/usePortalNavigation';
import { GritIcon } from '@/components/ui';
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
        className="flex items-center gap-1.5 rounded-grit-md px-2.5 py-1.5 font-grit-body text-sm font-semibold text-grit-subtext transition-colors hover:bg-grit-cyan/10 hover:text-grit-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"
        onClick={() => setOpen((prev) => !prev)}
      >
        <GritIcon name="grid_view" size={20} className="text-grit-cyan" />
        <span className="hidden sm:inline">Menú</span>
        <GritIcon
          name="expand_more"
          size={16}
          className={`text-grit-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 flex w-60 flex-col gap-1 overflow-hidden rounded-grit-lg border border-grit-glass-border bg-grit-bg/95 p-2 shadow-xl backdrop-blur-md"
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
                  'flex items-center gap-3.5 rounded-grit-md border px-3.5 py-2.5 font-grit-body text-sm transition-colors',
                  // Active item mirrors the design's "Nav Operación" state (zfVKC)
                  isActive
                    ? 'border-grit-glass-border bg-gradient-to-r from-grit-cyan/15 to-transparent font-semibold text-grit-text'
                    : 'border-transparent font-medium text-grit-subtext hover:bg-grit-cyan/10 hover:text-grit-text',
                ].join(' ')}
                onClick={() => setOpen(false)}
              >
                <GritIcon name={item.icon} size={18} className={isActive ? 'text-grit-cyan' : 'text-grit-subtext'} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
