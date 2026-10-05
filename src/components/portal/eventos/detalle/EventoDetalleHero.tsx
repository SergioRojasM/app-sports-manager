'use client';

import { useState, type ReactNode } from 'react';
import { GritIcon, GritTag, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { EVENTOS_TIME_ZONE, formatCupo } from '@/lib/portal/eventos.utils';
import { toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { EventoBannerModal } from '../EventoBannerModal';
import type { EventoPublicoDetalle } from '@/types/portal/eventos.types';

type EventoDetalleHeroProps = {
  evento: EventoPublicoDetalle;
  /** "Evento público" / "Evento privado". */
  tipoLabel: string;
  /** Rendered at the end of the title block (divider + description). */
  children?: ReactNode;
};

function formatFecha(fechaHora: string | null): string {
  if (!fechaHora) return 'Fecha por definir';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: EVENTOS_TIME_ZONE }).format(new Date(fechaHora));
}

/** "07:00 a. m. – 08:30 a. m." in Bogotá, collapsing to just the start when no duration is set. */
function formatRangoHorario(fechaHora: string, duracionMinutos: number | null): string {
  const formatter = new Intl.DateTimeFormat('es-CO', { timeStyle: 'short', timeZone: EVENTOS_TIME_ZONE });
  const start = new Date(fechaHora);
  if (!duracionMinutos) return formatter.format(start);
  const end = new Date(start.getTime() + duracionMinutos * 60_000);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function MetaItem({
  icon,
  top,
  bottom,
  href,
}: {
  icon: string;
  top: string;
  bottom?: string | null;
  /** When set, `bottom` renders as a link opening in a new tab. */
  href?: string | null;
}) {
  return (
    <li className="flex items-start gap-2">
      <GritIcon name={icon} size={15} className="mt-0.5 text-grit-cyan" />
      <span className="flex flex-col gap-px">
        <span className="font-grit-body text-[13px] font-semibold text-grit-text">{top}</span>
        {bottom && href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-grit-body text-[11px] font-semibold text-grit-cyan underline"
          >
            {bottom}
            <GritIcon name="open_in_new" size={12} />
          </a>
        ) : bottom ? (
          <span className="font-grit-body text-[11px] font-medium text-grit-subtext">{bottom}</span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Banner, tags, organization, title and meta row of the event page (US-0120). Keeps the approved
 * event layout from US-0119: location is a header link from `punto_encuentro`, with no separate card.
 */
export function EventoDetalleHero({ evento, tipoLabel, children }: EventoDetalleHeroProps) {
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const ubicacionUrl = toHttpUrl(evento.puntoEncuentro);
  const paginaEventoUrl = toHttpUrl(evento.paginaEventoUrl);
  const disciplina = getDisciplinaVisual(evento.disciplinaNombre);
  const showBanner = Boolean(evento.bannerUrl) && !bannerFailed;

  return (
    <section className="flex flex-col gap-8">
      <div className="relative h-56 w-full overflow-hidden rounded-grit-2xl sm:h-72 lg:h-[340px]">
        {showBanner ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evento.bannerUrl ?? undefined}
              alt={evento.nombre}
              onError={() => setBannerFailed(true)}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-grit-bg/90 via-grit-bg/40 to-transparent" />
            <button
              type="button"
              aria-label="Ver imagen"
              onClick={() => setBannerModalOpen(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1 rounded-grit-sm border border-grit-glass-border bg-grit-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-grit-text transition hover:text-grit-cyan"
            >
              <GritIcon name="visibility" size={12} />
              Ver
            </button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-grit-card to-grit-bg">
            <GritIcon name={disciplina.icon} size={56} className={cx(disciplina.colorClass, 'opacity-60')} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <GritTag tone="accent" icon={disciplina.icon}>
            {evento.disciplinaNombre}
          </GritTag>
          <GritTag tone="neutral">{tipoLabel}</GritTag>
        </div>

        <div className="flex flex-col gap-2">
          {evento.nombreTenant && (
            <p className="flex items-center gap-1.5 font-grit-body text-sm font-semibold text-grit-cyan">
              <GritIcon name="shield" size={15} />
              {evento.nombreTenant}
            </p>
          )}
          <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-4xl lg:text-[40px]">
            {evento.nombre}
          </h1>
        </div>

        {evento.descripcion && (
          <p className="max-w-3xl whitespace-pre-wrap font-grit-body text-[15px] font-medium text-grit-subtext">
            {evento.descripcion}
          </p>
        )}

        <ul className="flex flex-wrap gap-x-7 gap-y-3">
          <MetaItem icon="calendar_today" top={formatFecha(evento.fechaHora)} />
          {evento.fechaHora && <MetaItem icon="schedule" top={formatRangoHorario(evento.fechaHora, evento.duracionMinutos)} />}
          {ubicacionUrl ? (
            <MetaItem
              icon="location_on"
              top={evento.escenarioNombre || 'Punto de encuentro'}
              bottom="Ver ubicación"
              href={ubicacionUrl}
            />
          ) : (
            <MetaItem
              icon="location_on"
              top={evento.escenarioNombre || evento.puntoEncuentro || 'Lugar por definir'}
              bottom={evento.escenarioNombre ? evento.puntoEncuentro ?? evento.escenarioUbicacion : null}
            />
          )}
          <MetaItem icon="group" top={formatCupo(evento.cupoMaximo)} />
          {evento.reservaAntelacionHoras !== null && (
            <MetaItem
              icon="event_available"
              top={`Reserva hasta ${evento.reservaAntelacionHoras} h antes`}
              bottom="del inicio del evento"
            />
          )}
          {paginaEventoUrl && (
            <MetaItem icon="language" top="Página del evento" bottom="Ver página oficial" href={paginaEventoUrl} />
          )}
        </ul>

        {children}
      </div>

      {showBanner && evento.bannerUrl && (
        <EventoBannerModal
          open={bannerModalOpen}
          bannerUrl={evento.bannerUrl}
          alt={evento.nombre}
          onClose={() => setBannerModalOpen(false)}
        />
      )}
    </section>
  );
}
