'use client';

import Link from 'next/link';
import type { MenuItem } from '@/types/portal.types';
import { GritIcon } from '@/components/ui';

type RoleBasedMenuProps = {
  menuItems: MenuItem[];
  activePath: string;
};

export function RoleBasedMenu({ menuItems, activePath }: RoleBasedMenuProps) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {menuItems.map((item) => {
        const isActive = activePath === item.href || activePath.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex items-center gap-3.5 rounded-grit-md border px-3.5 py-2.5 font-grit-body text-sm transition-colors',
              isActive
                ? 'border-grit-glass-border bg-gradient-to-r from-grit-cyan/15 to-transparent font-semibold text-grit-text'
                : 'border-transparent font-medium text-grit-subtext hover:bg-grit-cyan/10 hover:text-grit-text',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            <GritIcon name={item.icon} size={18} className={isActive ? 'text-grit-cyan' : undefined} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
