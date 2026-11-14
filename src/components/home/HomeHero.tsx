import Link from 'next/link';
import { GritIcon } from '@/components/ui';
import { HeroVideoBackground } from './HeroVideoBackground';

type HomeHeroProps = {
  isAuthenticated: boolean;
};

export function HomeHero({ isAuthenticated }: HomeHeroProps) {
  const secondary = isAuthenticated
    ? { href: '/portal', label: 'Mi portal' }
    : { href: '/auth/login', label: 'Iniciar sesión' };

  return (
    <section id="inicio" className="relative isolate flex min-h-[720px] flex-col overflow-hidden md:min-h-[860px] lg:min-h-[100svh]">
      <HeroVideoBackground />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-10 pt-28 text-center md:gap-7 md:px-10">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-grit-glass-border bg-grit-glass px-3 py-1.5 backdrop-blur md:px-4 md:py-2">
          <span className="h-2 w-2 rounded-full bg-grit-cyan shadow-[0_0_10px_#14DBC4]" />
          <span className="font-grit-title text-[11px] font-bold uppercase tracking-[0.2em] text-grit-cyan-light md:text-sm md:tracking-[0.25em]">
            Eventos · Clubes · Entrenamientos
          </span>
        </span>

        <h1 className="max-w-[980px] font-grit-title text-[46px] font-bold italic leading-[0.98] tracking-[-0.01em] text-grit-text [text-shadow:0_4px_40px_rgba(7,17,31,0.8)] md:text-[72px] md:leading-[0.95] lg:text-[88px]">
          La plataforma donde el deporte evoluciona
        </h1>

        <span className="h-[3px] w-[72px] rounded-full bg-gradient-to-r from-transparent via-grit-cyan to-transparent md:w-24" />

        <p className="max-w-[620px] font-grit-body text-base leading-relaxed text-grit-subtext md:text-[19px] md:leading-[1.6]">
          Descubre eventos, entrena con tu club y gestiona tus entradas en un solo lugar.
        </p>

        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Link
            href="/eventos"
            className="inline-flex items-center justify-center gap-2.5 rounded-grit-lg bg-grit-cyan px-7 py-4 font-grit-title text-lg font-bold text-grit-bg shadow-[0_8px_32px_rgba(20,219,196,0.33)] transition hover:bg-grit-cyan-light md:text-xl"
          >
            Ver eventos
            <GritIcon name="arrow_forward" size={20} />
          </Link>
          <Link
            href={secondary.href}
            className="inline-flex items-center justify-center rounded-grit-lg border-[1.5px] border-grit-cyan bg-grit-bg/40 px-7 py-4 font-grit-title text-lg font-bold text-grit-cyan backdrop-blur transition hover:bg-grit-cyan/10 md:text-xl"
          >
            {secondary.label}
          </Link>
        </div>
      </div>

      <a
        href="#eventos"
        className="relative z-10 mx-auto mb-8 hidden flex-col items-center gap-1.5 text-grit-muted transition hover:text-grit-cyan md:flex"
      >
        <span className="font-grit-title text-xs font-bold uppercase tracking-[0.25em]">Desliza</span>
        <GritIcon name="keyboard_double_arrow_down" size={20} className="text-grit-cyan" />
      </a>
    </section>
  );
}
