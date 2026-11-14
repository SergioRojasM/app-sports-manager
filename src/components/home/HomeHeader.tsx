'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GritIcon, cx } from '@/components/ui';
import { useHeaderScrolled } from '@/hooks/home/useHeaderScrolled';

const NAV_ITEMS = [
  { label: 'Eventos', href: '/eventos' },
  { label: 'Organizaciones', href: '#organizaciones' },
];

type HomeHeaderProps = {
  isAuthenticated: boolean;
};

export function HomeHeader({ isAuthenticated }: HomeHeaderProps) {
  const scrolled = useHeaderScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const action = isAuthenticated
    ? { href: '/portal', label: 'Mi portal' }
    : { href: '/auth/login', label: 'Iniciar sesión' };

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        scrolled || menuOpen
          ? 'border-b border-grit-glass-border bg-grit-bg/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-4 md:px-10 md:py-5">
        <Link href="/" className="relative block h-[30px] w-[120px] md:h-[42px] md:w-[168px]">
          <Image src="/logo-navbar.png" alt="GRIT Arena" fill priority sizes="168px" className="object-contain" />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-10 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-grit-title text-[17px] font-semibold tracking-[0.04em] text-grit-subtext transition hover:text-grit-cyan-light"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={action.href}
            className="hidden rounded-grit-md bg-grit-cyan px-5 py-2.5 font-grit-title text-[17px] font-bold text-grit-bg transition hover:bg-grit-cyan-light sm:inline-flex"
          >
            {action.label}
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="home-mobile-menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-grit-lg border border-grit-glass-border bg-grit-glass text-grit-text lg:hidden"
          >
            <GritIcon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="home-mobile-menu" aria-label="Principal" className="flex flex-col gap-1 border-t border-grit-glass-border px-5 pb-5 pt-3 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-grit-md px-2 py-3 font-grit-title text-lg font-semibold text-grit-subtext transition hover:bg-white/5 hover:text-grit-cyan-light"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={action.href}
            onClick={() => setMenuOpen(false)}
            className="mt-2 inline-flex justify-center rounded-grit-lg bg-grit-cyan px-5 py-3 font-grit-title text-lg font-bold text-grit-bg sm:hidden"
          >
            {action.label}
          </Link>
        </nav>
      )}
    </header>
  );
}
