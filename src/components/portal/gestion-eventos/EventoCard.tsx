import type { ReactNode } from 'react';
import { GritDateTile, GritIcon, GritMediaCard, GritOverlayPill, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { formatCupo, formatDuracion, formatEventoFecha, formatEventoPrecio } from '@/lib/portal/eventos.utils';
import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import { EventoActionsMenu } from './EventoActionsMenu';
import { EventoActivoBadge } from './EventoActivoBadge';
import { EventoEstadoBadge } from './EventoEstadoBadge';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type EventoCardProps = {
  evento: EventoListItem;
  onEditar?: () => void;
  onCambiarEstado?: (target: EventoEstado) => void;
  onEliminar?: () => void;
  /** Quick activar/desactivar from the actions menu. */
  onCambiarActivo?: () => void;
  onVerCompras?: () => void;
  onControlIngreso?: () => void;
  onDuplicar?: () => void;
  /** Used by the wizard's live preview (US-0119). */
  hideActions?: boolean;
};

const noop = () => {};

function MetaLine({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 font-grit-body text-[11px] text-grit-subtext">
      <GritIcon name={icon} size={12} className="shrink-0 text-grit-cyan" />
      <span className="truncate">{children}</span>
    </p>
  );
}

/**
 * Management card of the "Tarjetas" view. No v3 frame: composed from the event-card family
 * (`uCKmV`) — photo surface, opaque overlay tags, date tile, meta lines and price pill.
 */
export function EventoCard({
  evento,
  onEditar = noop,
  onCambiarEstado = noop,
  onEliminar = noop,
  onCambiarActivo,
  onVerCompras,
  onControlIngreso,
  onDuplicar,
  hideActions = false,
}: EventoCardProps) {
  const visual = getDisciplinaVisual(evento.disciplinaNombre);
  const cancelado = !evento.borrador && evento.estado === 'cancelado';
  const lugar = evento.escenarioNombre ?? evento.puntoEncuentro;
  const duracion = formatDuracion(evento.duracionMinutos);
  const precio = evento.borrador && evento.precio.length === 0 ? 'Precio por definir' : formatEventoPrecio(evento.precio);
  const fecha = evento.fechaHora
    ? `${formatEventoFecha(evento.fechaHora)} · ${formatHoraCorta(evento.fechaHora)}${duracion ? ` · ${duracion}` : ''}`
    : 'Fecha por definir';

  return (
    <GritMediaCard
      as="article"
      image={evento.bannerUrl}
      placeholderIcon={visual.icon}
      padding={14}
      className={cx(
        'min-h-[360px]',
        // Inactive events are hidden from members and visitors: make that obvious at a glance
        !evento.activo && 'outline-2 outline-offset-2 outline-dashed outline-grit-warning/60',
        cancelado && 'opacity-75',
      )}
      top={
        <>
          {/* Opaque tags so they stay legible over any banner image */}
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <EventoEstadoBadge estado={evento.estado} borrador={evento.borrador} overlay />
            <EventoActivoBadge activo={evento.activo} overlay />
            {!evento.publico && (
              <GritOverlayPill icon="lock" iconTone="ink">
                Privado
              </GritOverlayPill>
            )}
          </div>
          {!hideActions && (
            <span className="shrink-0 rounded-full bg-grit-bg/60 backdrop-blur-sm">
              <EventoActionsMenu
                eventoNombre={evento.nombre}
                estado={evento.estado}
                borrador={evento.borrador}
                activo={evento.activo}
                onCambiarActivo={onCambiarActivo}
                onVerCompras={onVerCompras}
                onControlIngreso={onControlIngreso}
                onDuplicar={onDuplicar}
                onEditar={onEditar}
                onCambiarEstado={onCambiarEstado}
                onEliminar={onEliminar}
              />
            </span>
          )}
        </>
      }
      bottom={
        <>
          <div className="flex items-end justify-between gap-2">
            <GritDateTile dateIso={evento.fechaHora} size="md" />
            <GritOverlayPill size="lg">{precio}</GritOverlayPill>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className={cx('font-grit-body text-[15px] font-semibold leading-tight', cancelado ? 'text-grit-muted' : 'text-grit-text')}>
              {evento.nombre}
            </h3>
            <p className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-subtext">
              <GritIcon name={visual.icon} size={12} className="text-grit-cyan" />
              {evento.disciplinaNombre ?? 'Sin disciplina'}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <MetaLine icon="calendar_today">{fecha}</MetaLine>
            {lugar && <MetaLine icon="location_on">{lugar}</MetaLine>}
            {evento.entrenadorNombre && <MetaLine icon="person">{evento.entrenadorNombre}</MetaLine>}
            <MetaLine icon="group">{formatCupo(evento.cupoMaximo)}</MetaLine>
          </div>
        </>
      }
    />
  );
}
