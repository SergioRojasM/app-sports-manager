import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { label: 'Plataforma', href: '#hero' },
  { label: 'Funciones', href: '#operacion' },
  { label: 'Para equipos', href: '#solucion' },
  { label: 'Precios', href: '#pricing' },
  { label: 'Recursos', href: '#footer' },
];

export default function Header() {
  return (
    <nav className="absolute inset-x-0 top-0 z-40 px-5 py-5 md:px-8 lg:px-10">
      <div className="landing-panel mx-auto flex w-full max-w-[1280px] items-center justify-between rounded-full px-4 py-3 sm:px-6 lg:px-8">
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
            <a
              key={item.label}
              className="landing-nav-link font-landing-display text-base font-semibold tracking-[0.04em]"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/entrenamientos-publicos"
            className="hidden font-landing-display text-sm font-semibold tracking-[0.04em] text-landing-text-secondary transition hover:text-landing-primary sm:inline-flex"
          >
            Ver entrenamientos
          </Link>
          <Link
            href="/auth/login"
            className="landing-primary-button font-landing-display inline-flex items-center justify-center px-4 py-2 text-sm font-bold tracking-[0.04em] sm:px-5 sm:py-2.5 sm:text-base"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </nav>
  );
}
