'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

const navItems: NavItem[] = [
  {
    label: 'Plataforma',
    href: '/#hero',
    children: [
      // "Equipos y clubes" y "Atletas" quedan ocultos hasta que esos módulos estén implementados.
      { label: 'Calendario de Entrenamientos', href: '/entrenamientos-publicos' },
    ],
  },
  { label: 'Funciones', href: '/#operacion' },
  { label: 'Para equipos', href: '/#solucion' },
  { label: 'Precios', href: '/#pricing' },
  { label: 'Recursos', href: '/#footer' },
];

function PlataformaDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="landing-nav-link font-landing-display flex items-center gap-1 text-base font-semibold tracking-[0.04em]"
        onClick={() => setOpen((prev) => !prev)}
      >
        {item.label}
        <span
          className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="landing-panel absolute left-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl py-2"
        >
          {item.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              role="menuitem"
              className="font-landing-body block px-4 py-2.5 text-sm text-landing-text-secondary transition hover:bg-white/5 hover:text-landing-primary-light"
              onClick={() => setOpen(false)}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
            {navItems.map((item) =>
              item.children ? (
                <PlataformaDropdown key={item.label} item={item} />
              ) : (
                <a
                  key={item.label}
                  className="landing-nav-link font-landing-display text-base font-semibold tracking-[0.04em]"
                  href={item.href}
                >
                  {item.label}
                </a>
              )
            )}
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
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label} className="flex flex-col">
                  <span className="font-landing-display px-2 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-landing-text-muted">
                    {item.label}
                  </span>
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="font-landing-body rounded-lg px-4 py-2.5 text-base text-landing-text-secondary transition hover:bg-white/5 hover:text-landing-primary-light"
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="font-landing-display rounded-lg px-2 py-2.5 text-base font-semibold text-landing-text-secondary transition hover:bg-white/5 hover:text-landing-primary-light"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
