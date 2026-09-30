'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GritIcon, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import {
  formatCupo,
  formatDuracion,
  formatEventoFecha,
  formatEventoHora,
  formatEventoPrecio,
} from '@/lib/portal/eventos.utils';
import { toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { EventoBannerModal } from './EventoBannerModal';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

type EventoPublicoCardProps = {
  evento: EventoPublicoListItem;
  featured?: boolean;
  detalleHref: string;
  onObtenerEntrada: () => void;
  obtenerEntradaDisabled?: boolean;
};

function InfoColumn({ icon, top, bottom }: { icon: string; top: string; bottom?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0">
      <span className="flex items-center gap-0.5 font-semibold text-grit-text">
        <GritIcon name={icon} size={11} className="shrink-0 text-grit-cyan" />
        <span className="truncate">{top}</span>
      </span>
      <span className="truncate">{bottom ?? ''}</span>
    </div>
  );
}

/** Discovery card for /eventos and /portal/eventos (US-0120), adapted from the public-training card. */
export function EventoPublicoCard({
  evento,
  featured = false,
  detalleHref,
  onObtenerEntrada,
  obtenerEntradaDisabled = false,
}: EventoPublicoCardProps) {
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const visual = getDisciplinaVisual(evento.disciplinaNombre);
  const showBanner = Boolean(evento.bannerUrl) && !bannerFailed;
  // A meeting point that is a maps link is shown as a label; the link itself lives on the detail page
  const puntoEncuentro = toHttpUrl(evento.puntoEncuentro) ? 'Punto de encuentro' : evento.puntoEncuentro;
  const lugar = evento.escenarioNombre ?? puntoEncuentro ?? 'Lugar por definir';
  const lugarDetalle = evento.escenarioNombre && !toHttpUrl(evento.escenarioUbicacion) ? evento.escenarioUbicacion : null;
  const duracion = formatDuracion(evento.duracionMinutos);

  return (
    <>
      <article
        className={cx(
          'flex flex-col overflow-hidden rounded-grit-2xl border transition',
          featured ? 'border-grit-cyan/60 shadow-[0_0_32px_rgba(20,219,196,0.15)]' : 'border-grit-glass-border',
        )}
      >
        <div className="relative h-64 w-full overflow-hidden">
          {showBanner ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evento.bannerUrl ?? undefined}
                alt={evento.nombre}
                loading={featured ? 'eager' : 'lazy'}
                onError={() => setBannerFailed(true)}
                className="h-full w-full object-cover"
              />
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
              <GritIcon name={visual.icon} size={48} className={cx(visual.colorClass, 'opacity-60')} />
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {featured && (
              <span className="flex items-center gap-1 rounded-grit-sm border border-grit-cyan/50 bg-grit-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-grit-cyan">
                <GritIcon name="star" size={12} />
                Próximo
              </span>
            )}
            {!evento.publico && (
              <span className="flex items-center gap-1 rounded-grit-sm border border-grit-glass-border bg-grit-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-grit-text">
                <GritIcon name="lock" size={12} />
                Solo miembros
              </span>
            )}
          </div>

          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-grit-sm border border-grit-glass-border bg-grit-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-grit-text">
            <GritIcon name={visual.icon} size={12} className={visual.colorClass} />
            {evento.disciplinaNombre}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 bg-grit-card p-3.5 backdrop-blur">
          <h3 className="font-grit-title text-lg font-bold italic text-grit-text">{evento.nombre}</h3>

          {evento.nombreTenant && (
            <p className="-mt-1 flex items-center gap-1 font-grit-body text-xs font-semibold text-grit-cyan">
              <GritIcon name="shield" size={13} />
              {evento.nombreTenant}
            </p>
          )}

          {evento.descripcion && (
            <p className="line-clamp-2 whitespace-pre-wrap font-grit-body text-sm text-grit-subtext">{evento.descripcion}</p>
          )}

          <div className="grid grid-cols-3 gap-1 font-grit-body text-[10px] text-grit-subtext">
            <InfoColumn icon="calendar_month" top={formatEventoFecha(evento.fechaHora)} bottom={formatEventoHora(evento.fechaHora)} />
            <InfoColumn icon="location_on" top={lugar} bottom={lugarDetalle} />
            <InfoColumn icon="groups" top={formatCupo(evento.cupoMaximo)} bottom={duracion} />
          </div>

          {evento.entrenadorNombre && (
            <p className="flex items-center gap-1 font-grit-body text-[11px] text-grit-subtext">
              <GritIcon name="sports" size={13} className="text-grit-cyan" />
              Con {evento.entrenadorNombre}
            </p>
          )}

          {evento.reservaAntelacionHoras != null && (
            <p className="flex items-center gap-1 font-grit-body text-[11px] text-grit-subtext">
              <GritIcon name="schedule" size={13} className="text-grit-cyan" />
              Reserva con al menos {evento.reservaAntelacionHoras}h de anticipación
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
            <span className="font-grit-title text-base font-bold text-grit-text">{formatEventoPrecio(evento.precio)}</span>
            <div className="flex items-center gap-2">
              <Link
                href={detalleHref}
                className="rounded-grit-md border border-grit-glass-border px-3 py-2 font-grit-body text-sm font-semibold text-grit-subtext transition hover:border-grit-cyan/40 hover:text-grit-cyan"
              >
                Ver detalles
              </Link>
              <button
                type="button"
                onClick={onObtenerEntrada}
                disabled={obtenerEntradaDisabled}
                aria-disabled={obtenerEntradaDisabled}
                className="rounded-grit-md bg-grit-cyan px-4 py-2 font-grit-body text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                Obtener entrada
              </button>
            </div>
          </div>
        </div>
      </article>

      {showBanner && evento.bannerUrl && (
        <EventoBannerModal
          open={bannerModalOpen}
          bannerUrl={evento.bannerUrl}
          alt={evento.nombre}
          onClose={() => setBannerModalOpen(false)}
        />
      )}
    </>
  );
}
