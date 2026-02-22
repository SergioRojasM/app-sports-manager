'use client';

import Link from 'next/link';
import type { MenuItem } from '@/types/portal.types';

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
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'sidebar-item-active text-turquoise'
                : 'text-slate-400 hover:bg-navy-soft hover:text-slate-100',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
