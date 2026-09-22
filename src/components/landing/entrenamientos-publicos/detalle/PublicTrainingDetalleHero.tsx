'use client';

import type { ReactNode } from 'react';
import { GritIcon, GritTag } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

type PublicTrainingDetalleHeroProps = {
  item: PublicTrainingListItem;
  /** Rendered at the end of the title block (divider + description, design `VekF7`). */
  children?: ReactNode;
};

function formatFecha(fechaHora: string | null): string {
  if (!fechaHora) return 'Sin fecha definida';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(new Date(fechaHora));
}

/** "07:00 AM – 08:30 AM", collapsing to just the start when no duration is set. */
function formatRangoHorario(fechaHora: string | null, duracionMinutos: number | null): string {
  if (!fechaHora) return '';
  const formatter = new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' });
  const start = new Date(fechaHora);
  if (!duracionMinutos) return formatter.format(start);
  const end = new Date(start.getTime() + duracionMinutos * 60_000);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function MetaItem({ icon, top, bottom }: { icon: string; top: string; bottom?: string | null }) {
  return (
    <li className="flex items-start gap-2">
      <GritIcon name={icon} size={15} className="mt-0.5 text-grit-cyan" />
      <span className="flex flex-col gap-px">
        <span className="font-grit-body text-[13px] font-semibold text-grit-text">{top}</span>
        {bottom ? <span className="font-grit-body text-[11px] font-medium text-grit-subtext">{bottom}</span> : null}
      </span>
    </li>
  );
}

/**
 * Banner + tags + title/subtitle + meta row, matching design nodes `UBgoO`
 * (banner) and `VekF7` (title block) (US-0109, restyled in US-0116).
 */
export function PublicTrainingDetalleHero({ item, children }: PublicTrainingDetalleHeroProps) {
  const cupoMaximo = item.cupoMaximo ?? 0;
  // The design labels this slot "cupos disponibles", so it must show remaining
  // capacity — `reservasActivas` is the count already taken (US-0109)
  const cuposDisponibles = Math.max(0, cupoMaximo - item.reservasActivas);
  const disciplina = getDisciplinaVisual(item.disciplinaNombre);

  return (
    <section className="flex flex-col gap-8">
      <div className="relative h-56 w-full overflow-hidden rounded-grit-2xl sm:h-72 lg:h-[340px]">
        {item.bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.bannerUrl} alt={item.nombre} className="h-full w-full object-cover" />
            {/* Matches the design's `N4UNU` overlay, which keeps the banner's
                lower edge blending into the page over an arbitrary image */}
            <div className="absolute inset-0 bg-gradient-to-t from-grit-bg/90 via-grit-bg/40 to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-grit-card">
            <GritIcon name="image" size={48} className="text-grit-subtext/40" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <GritTag tone="accent" icon={disciplina.icon}>
            {item.disciplinaNombre}
          </GritTag>
          <GritTag tone="neutral">Entrenamiento público</GritTag>
        </div>

        <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-4xl lg:text-[40px]">
          {item.nombre}
        </h1>

        {item.descripcion && (
          <p className="max-w-3xl whitespace-pre-wrap font-grit-body text-[15px] font-medium text-grit-subtext">
            {item.descripcion}
          </p>
        )}

        <ul className="flex flex-wrap gap-x-7 gap-y-3">
          <MetaItem icon="calendar_today" top={formatFecha(item.fechaHora)} />
          {item.fechaHora && (
            <MetaItem icon="schedule" top={formatRangoHorario(item.fechaHora, item.duracionMinutos)} />
          )}
          <MetaItem icon="location_on" top={item.escenarioNombre} bottom={item.puntoEncuentro} />
          <MetaItem icon="group" top={`${cuposDisponibles} / ${cupoMaximo || '—'}`} bottom="cupos disponibles" />
        </ul>

        {children}
      </div>
    </section>
  );
}
