import { GritIcon, GritTag, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import {
  formatCupo,
  formatDuracion,
  formatEventoFecha,
  formatEventoHora,
  formatEventoPrecio,
} from '@/lib/portal/eventos.utils';
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

function InfoLine({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 font-grit-body text-xs text-grit-subtext">
      <GritIcon name={icon} size={14} className="text-grit-cyan" />
      <span className="truncate">{children}</span>
    </p>
  );
}

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

  return (
    <article
      className={cx(
        'flex flex-col overflow-hidden rounded-grit-2xl border transition',
        // Inactive events are hidden from members and visitors: make that obvious at a glance
        evento.activo ? 'border-grit-glass-border' : 'border-dashed border-amber-400/60',
        cancelado && 'opacity-70',
      )}
    >
      <div className="relative h-40 w-full overflow-hidden">
        {evento.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.bannerUrl} alt="" className={cx('h-full w-full object-cover', cancelado && 'grayscale')} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-grit-card to-grit-bg">
            <GritIcon name={visual.icon} size={44} className={cx(visual.colorClass, 'opacity-60')} />
          </div>
        )}

        {/* Opaque pills so they stay legible over any banner image */}
        <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-1.5">
          <EventoEstadoBadge estado={evento.estado} borrador={evento.borrador} overlay />
          <EventoActivoBadge activo={evento.activo} overlay />
        </div>

        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-grit-sm border border-grit-glass-border bg-grit-bg/80 px-2.5 py-1 font-grit-body text-[10px] font-semibold uppercase tracking-wide text-grit-text">
          <GritIcon name={visual.icon} size={12} className={visual.colorClass} />
          {evento.disciplinaNombre ?? 'Sin disciplina'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 bg-grit-card p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cx(
              'font-grit-title text-lg font-bold leading-tight',
              cancelado ? 'text-grit-muted' : 'text-grit-text',
            )}
          >
            {evento.nombre}
          </h3>
          {!hideActions && (
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
          )}
        </div>

        {!evento.publico && (
          <div className="flex flex-wrap gap-1.5">
            <GritTag tone="neutral" icon="lock">
              Privado
            </GritTag>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <InfoLine icon="calendar_month">
            {formatEventoFecha(evento.fechaHora)}
            {evento.fechaHora ? ` · ${formatEventoHora(evento.fechaHora)}` : ''}
            {duracion ? ` · ${duracion}` : ''}
          </InfoLine>
          {lugar && <InfoLine icon="location_on">{lugar}</InfoLine>}
          {evento.entrenadorNombre && <InfoLine icon="person">{evento.entrenadorNombre}</InfoLine>}
          <InfoLine icon="groups">{formatCupo(evento.cupoMaximo)}</InfoLine>
        </div>

        <p className="mt-auto pt-2 font-grit-title text-base font-bold text-grit-text">
          {evento.borrador && evento.precio.length === 0 ? 'Precio por definir' : formatEventoPrecio(evento.precio)}
        </p>
      </div>
    </article>
  );
}
