'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { GritIcon, cx } from '@/components/ui';
import { useHomeEventos } from '@/hooks/home/useHomeEventos';
import { EventoCintaCard } from './EventoCintaCard';
import { EventosCintaSkeleton } from './EventosCintaSkeleton';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

/** Below this count the desktop ribbon does not animate (a loop of 2-3 cards looks broken). */
const MARQUEE_MIN_ITEMS = 4;
/** Seconds each card adds to one marquee loop. */
const MARQUEE_SECONDS_PER_ITEM = 6;

function VerTodosLink({ className }: { className?: string }) {
  return (
    <Link
      href="/eventos"
      className={cx(
        // Display is set by the caller (`inline-flex` / `hidden md:inline-flex`) so both don't clash
        'items-center justify-center gap-2.5 rounded-grit-lg border-[1.5px] border-grit-cyan px-6 py-3.5 font-grit-title text-lg font-bold text-grit-cyan transition hover:bg-grit-cyan/10',
        className,
      )}
    >
      Ver todos los eventos
      <GritIcon name="arrow_forward" size={18} />
    </Link>
  );
}

function EmptyBlock() {
  return (
    <div className="mx-5 flex flex-col items-center gap-4 rounded-[20px] border border-grit-cyan/20 bg-grit-glass px-6 py-14 text-center md:mx-auto md:max-w-[1000px] md:px-10">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-grit-glass-border bg-grit-cyan/10">
        <GritIcon name="event_upcoming" size={28} className="text-grit-cyan" />
      </span>
      <h3 className="font-grit-title text-[28px] font-bold italic text-grit-text">Pronto habrá nuevos eventos</h3>
      <p className="max-w-[520px] font-grit-body text-[15px] leading-relaxed text-grit-subtext">
        Los clubes están preparando su próxima fecha. Mientras tanto, explora el calendario completo.
      </p>
      <Link
        href="/eventos"
        className="inline-flex items-center gap-2.5 rounded-grit-lg border-[1.5px] border-grit-cyan px-5 py-3 font-grit-title text-[17px] font-bold text-grit-cyan transition hover:bg-grit-cyan/10"
      >
        Ver eventos
        <GritIcon name="arrow_forward" size={17} />
      </Link>
    </div>
  );
}

/** Desktop (≥768px) ribbon: seamless CSS marquee with a duplicated, inert copy. */
function DesktopRibbon({ items }: { items: EventoPublicoListItem[] }) {
  const animated = items.length >= MARQUEE_MIN_ITEMS;
  const style = { '--home-marquee-duration': `${items.length * MARQUEE_SECONDS_PER_ITEM}s` } as CSSProperties;

  if (!animated) {
    return (
      <div className="flex justify-center gap-6 px-10">
        {items.map((evento, index) => (
          <EventoCintaCard key={evento.id} evento={evento} featured={index === 0} />
        ))}
      </div>
    );
  }

  return (
    <div className="home-marquee-wrap overflow-x-hidden" style={style}>
      <div className="home-marquee flex w-max">
        <div className="flex gap-6 pr-6">
          {items.map((evento, index) => (
            <EventoCintaCard key={evento.id} evento={evento} featured={index === 0} />
          ))}
        </div>
        {/* Second copy only exists to close the loop: hidden from AT and from the Tab order */}
        <div className="home-marquee-copy flex gap-6 pr-6" aria-hidden="true">
          {items.map((evento, index) => (
            <EventoCintaCard key={`copy-${evento.id}`} evento={evento} featured={index === 0} tabIndex={-1} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mobile (<768px) ribbon: swipe carousel with snap and decorative position dots. */
function MobileRibbon({ items }: { items: EventoPublicoListItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(cards.indexOf(visible.target as HTMLElement));
      },
      { root: track, threshold: 0.6 },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((evento, index) => (
          <EventoCintaCard key={evento.id} evento={evento} featured={index === 0} />
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-2" aria-hidden="true">
          {items.map((evento, index) => (
            <span
              key={evento.id}
              className={cx(
                'h-[7px] rounded-full transition-all',
                index === active ? 'w-[22px] bg-grit-cyan' : 'w-[7px] bg-grit-cyan/20',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EventosCintaSection() {
  const { items, loading } = useHomeEventos();
  const hasItems = items.length > 0;

  return (
    <section id="eventos" aria-labelledby="home-eventos-title" className="flex scroll-mt-20 flex-col gap-7 pb-[72px] pt-10 md:gap-11 md:pb-[120px] md:pt-14">
      <div className="mx-auto flex w-full max-w-[1440px] items-end justify-between gap-6 px-5 md:px-20">
        <div className="flex max-w-[780px] flex-col gap-2.5 md:gap-3.5">
          <span className="flex items-center gap-2.5">
            <span className="h-0.5 w-[22px] bg-grit-cyan md:w-7" />
            <span className="font-grit-title text-xs font-bold uppercase tracking-[0.25em] text-grit-cyan-light md:text-sm">
              Próximos eventos
            </span>
          </span>
          <h2 id="home-eventos-title" className="font-grit-title text-4xl font-bold italic leading-none text-grit-text md:text-[52px]">
            Vive el deporte en vivo
          </h2>
          <p className="hidden font-grit-body text-base leading-relaxed text-grit-subtext md:block">
            Carreras, travesías y clínicas de los clubes de GRIT Arena. Asegura tu entrada en minutos.
          </p>
        </div>
        {hasItems && <VerTodosLink className="hidden shrink-0 md:inline-flex" />}
      </div>

      {loading ? (
        <EventosCintaSkeleton />
      ) : !hasItems ? (
        <EmptyBlock />
      ) : (
        <>
          <div className="relative py-5 md:bg-[linear-gradient(180deg,rgba(15,31,48,0)_0%,rgba(15,31,48,0.5)_50%,rgba(15,31,48,0)_100%)] md:py-6">
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-grit-cyan/60 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-grit-cyan/60 to-transparent" />
            <div className="hidden md:block">
              <DesktopRibbon items={items} />
            </div>
            <div className="md:hidden">
              <MobileRibbon items={items} />
            </div>
            {/* Edge fades (desktop) */}
            <span className="pointer-events-none absolute inset-y-0 left-0 hidden w-[220px] bg-gradient-to-r from-grit-bg to-transparent md:block" />
            <span className="pointer-events-none absolute inset-y-0 right-0 hidden w-[220px] bg-gradient-to-l from-grit-bg to-transparent md:block" />
          </div>
          <div className="px-5 md:hidden">
            <VerTodosLink className="flex w-full" />
          </div>
        </>
      )}
    </section>
  );
}
