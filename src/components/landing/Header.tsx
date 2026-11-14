'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type NavItem = {
  label: string;
  href: string;
};

// Public pages header (/eventos, /equipos, /atletas). The marketing anchors moved to the external
// landing (US-0139); the app root is now the public home with an #organizaciones section (US-0140).
const navItems: NavItem[] = [
  { label: 'Eventos', href: '/eventos' },
  { label: 'Organizaciones', href: '/#organizaciones' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="absolute inset-x-0 top-0 z-40 px-5 py-5 md:px-8 lg:px-10">
      <div className="landing-panel mx-auto w-full max-w-[1280px] rounded-[28px] px-4 py-3 sm:px-6 lg:rounded-full lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="relative h-[31px] w-[136px] sm:h-[35px] sm:w-[156px] lg:h-[40px] lg:w-[176px]">
              <Image
                src="/logo-navbar.png"
                alt="GRIT Arena"
                fill
                priority
                sizes="(max-width: 639px) 136px, (max-width: 1023px) 156px, 176px"
                className="object-contain"
              />
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-8 xl:gap-10">
            {navItems.map((item) => (
              <Link
                key={item.label}
                className="landing-nav-link font-landing-display text-base font-semibold tracking-[0.04em]"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="landing-primary-button font-landing-display inline-flex items-center justify-center px-4 py-2 text-sm font-bold tracking-[0.04em] sm:px-5 sm:py-2.5 sm:text-base"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-landing-text transition hover:bg-white/5 lg:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-landing-display rounded-lg px-2 py-2.5 text-base font-semibold text-landing-text-secondary transition hover:bg-white/5 hover:text-landing-primary-light"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
