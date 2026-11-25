'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GritIcon, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { buildEventoLandingDetalleHref, toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { formatFechaBadge, formatPrecioCinta } from '@/lib/home/home.utils';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

type EventoCintaCardProps = {
  evento: EventoPublicoListItem;
  /** Soonest event: wider card with the "PRÓXIMO" ribbon and cyan glow. */
  featured?: boolean;
  /** -1 for the duplicated marquee copy, so each event is reached once with Tab. */
  tabIndex?: number;
  className?: string;
};

function locationOf(evento: EventoPublicoListItem): string | null {
  const escenario = [evento.escenarioNombre, evento.escenarioUbicacion].filter(Boolean).join(' · ');
  return escenario || evento.puntoEncuentro || null;
}

export function EventoCintaCard({ evento, featured = false, tabIndex, className }: EventoCintaCardProps) {
  const [bannerFailed, setBannerFailed] = useState(false);
  const visual = getDisciplinaVisual(evento.disciplinaNombre);
  const fecha = formatFechaBadge(evento.fechaHora);
  const bannerUrl = toHttpUrl(evento.bannerUrl);
  const ubicacion = locationOf(evento);

  return (
    <Link
      href={buildEventoLandingDetalleHref(evento.id, { from: '/' })}
      tabIndex={tabIndex}
      className={cx(
        'group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-grit-2xl border bg-grit-card backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-grit-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan',
        featured
          ? 'w-[280px] border-[1.5px] border-grit-cyan shadow-[0_12px_48px_rgba(20,219,196,0.33)] md:w-[340px]'
          : 'w-[280px] border-grit-glass-border md:w-[300px]',
        className,
      )}
    >
      <div className="relative h-[190px] w-full overflow-hidden">
        {bannerUrl && !bannerFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt=""
            loading="lazy"
            onError={() => setBannerFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#122233] to-grit-bg">
            <GritIcon name={visual.icon} size={48} className={cx(visual.colorClass, 'opacity-60')} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-[#0B1826]" />

        <div className="absolute left-4 top-4 flex min-w-[58px] flex-col items-center rounded-grit-lg border border-grit-glass-border bg-grit-bg/80 px-2 py-2 backdrop-blur">
          {fecha ? (
            <>
              <span className="font-grit-title text-[28px] font-bold leading-none text-grit-text">{fecha.day}</span>
              <span className="font-grit-title text-[13px] font-bold tracking-[0.15em] text-grit-cyan">{fecha.month}</span>
            </>
          ) : (
            <span className="font-grit-title text-xs font-bold tracking-[0.1em] text-grit-cyan">POR DEFINIR</span>
          )}
        </div>

        {featured && (
          <span className="absolute right-0 top-[22px] flex items-center gap-1.5 rounded-l-full bg-gradient-to-r from-grit-cyan-light to-grit-cyan py-1.5 pl-3 pr-3 shadow-[0_4px_16px_rgba(20,219,196,0.4)]">
            <GritIcon name="workspace_premium" size={14} className="text-grit-bg" />
            <span className="font-grit-title text-xs font-bold tracking-[0.15em] text-grit-bg">PRÓXIMO</span>
          </span>
        )}

        <span className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-grit-sm border border-grit-glass-border bg-grit-bg/80 px-2.5 py-1">
          <GritIcon name={visual.icon} size={13} className={visual.colorClass} />
          <span className="font-grit-body text-xs font-semibold text-grit-text">{evento.disciplinaNombre}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-[18px] pb-[18px] pt-3.5">
        <h3 className="line-clamp-2 min-h-[46px] font-grit-title text-[22px] font-bold italic leading-[1.05] text-grit-text">
          {evento.nombre}
        </h3>

        <div className="flex flex-col gap-1.5">
          {evento.nombreTenant && (
            <p className="flex items-center gap-2 font-grit-body text-[13px] text-grit-subtext">
              <GritIcon name="shield" size={15} className="text-grit-muted" />
              <span className="truncate">{evento.nombreTenant}</span>
            </p>
          )}
          {ubicacion && (
            <p className="flex items-center gap-2 font-grit-body text-[13px] text-grit-subtext">
              <GritIcon name="location_on" size={15} className="text-grit-muted" />
              <span className="truncate">{ubicacion}</span>
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-grit-cyan/15 pt-3">
          <span className="font-grit-title text-[22px] font-bold text-grit-cyan">{formatPrecioCinta(evento.precio)}</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-grit-glass-border bg-grit-cyan/10 text-grit-cyan transition group-hover:bg-grit-cyan group-hover:text-grit-bg">
            <GritIcon name="north_east" size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}
