import type { ReactNode } from 'react';
import { cx } from '@/components/ui';
import { formatCupo, formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { EventoActionsMenu } from './EventoActionsMenu';
import { EventoActivoBadge } from './EventoActivoBadge';
import { EventoEstadoBadge } from './EventoEstadoBadge';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type EventosTableBaseProps = {
  eventos: EventoListItem[];
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

type EventosTableMenuProps = {
  renderAcciones?: undefined;
  onEditar: (evento: EventoListItem) => void;
  onCambiarEstado: (evento: EventoListItem, target: EventoEstado) => void;
  onEliminar: (evento: EventoListItem) => void;
  onCambiarActivo: (evento: EventoListItem) => void;
  onVerCompras: (evento: EventoListItem) => void;
  onControlIngreso: (evento: EventoListItem) => void;
  onDuplicar: (evento: EventoListItem) => void;
};

/**
 * Replaces the admin actions menu with the caller's own cell (check-in selector, US-0131). The
 * management-only columns (Visibilidad, Activo) are hidden to leave room for a wider action.
 */
type EventosTableCustomProps = {
  renderAcciones: (evento: EventoListItem) => ReactNode;
};

type EventosTableProps = EventosTableBaseProps & (EventosTableMenuProps | EventosTableCustomProps);

const COLUMNS = ['Evento', 'Fecha y hora', 'Lugar', 'Entrenador', 'Cupo', 'Visibilidad', 'Activo', 'Estado'];

function formatFechaHora(fechaHora: string | null): string {
  return fechaHora ? `${formatEventoFecha(fechaHora)} · ${formatEventoHora(fechaHora)}` : formatEventoFecha(null);
}

export function EventosTableSkeleton() {
  return (
    <div className="space-y-2 rounded-grit-md border border-grit-glass-border bg-grit-glass p-4" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-grit-xs bg-grit-card" />
      ))}
    </div>
  );
}

export function EventosTable(props: EventosTableProps) {
  const { eventos, currentPage, totalPages, totalFiltered, pageSize, onPageChange } = props;
  const soloLectura = Boolean(props.renderAcciones);
  const columns = soloLectura ? COLUMNS.filter((column) => column !== 'Visibilidad' && column !== 'Activo') : COLUMNS;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);

  const renderActions = (evento: EventoListItem) =>
    props.renderAcciones ? (
      props.renderAcciones(evento)
    ) : (
      <EventoActionsMenu
        eventoNombre={evento.nombre}
        estado={evento.estado}
        borrador={evento.borrador}
        activo={evento.activo}
        onCambiarActivo={() => props.onCambiarActivo(evento)}
        onVerCompras={() => props.onVerCompras(evento)}
        onControlIngreso={() => props.onControlIngreso(evento)}
        onDuplicar={() => props.onDuplicar(evento)}
        onEditar={() => props.onEditar(evento)}
        onCambiarEstado={(target) => props.onCambiarEstado(evento, target)}
        onEliminar={() => props.onEliminar(evento)}
      />
    );

  return (
    <div className="space-y-4">
      {/* md and up: table */}
      <div className="hidden overflow-x-auto rounded-grit-md border border-grit-glass-border md:block">
        <table className="w-full text-left font-grit-body text-sm">
          <thead className="border-b border-grit-glass-border bg-grit-glass text-xs uppercase tracking-wider text-grit-subtext">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3">
                  {column}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grit-glass-border">
            {eventos.map((evento) => {
              const cancelado = evento.estado === 'cancelado';
              return (
                <tr key={evento.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="max-w-[240px] px-4 py-3">
                    <div className={cx('truncate font-semibold', cancelado ? 'text-grit-muted' : 'text-grit-text')} title={evento.nombre}>
                      {evento.nombre}
                    </div>
                    <div className="truncate text-xs text-grit-subtext">{evento.disciplinaNombre ?? 'Sin disciplina'}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-grit-subtext">{formatFechaHora(evento.fechaHora)}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-grit-subtext">
                    {evento.escenarioNombre ?? evento.puntoEncuentro ?? '—'}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-grit-subtext">{evento.entrenadorNombre ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-grit-subtext">{evento.cupoMaximo ?? 'Ilimitado'}</td>
                  {!soloLectura && (
                    <>
                      <td className="px-4 py-3 text-grit-subtext">{evento.publico ? 'Público' : 'Privado'}</td>
                      <td className="px-4 py-3">
                        <EventoActivoBadge activo={evento.activo} />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <EventoEstadoBadge estado={evento.estado} borrador={evento.borrador} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">{renderActions(evento)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* below md: stacked rows */}
      <ul className="space-y-3 md:hidden">
        {eventos.map((evento) => (
          <li key={evento.id} className="rounded-grit-md border border-grit-glass-border bg-grit-glass p-4 font-grit-body">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={cx('truncate font-semibold', evento.estado === 'cancelado' ? 'text-grit-muted' : 'text-grit-text')}>
                  {evento.nombre}
                </p>
                <p className="text-xs text-grit-subtext">{evento.disciplinaNombre ?? 'Sin disciplina'}</p>
              </div>
              {!props.renderAcciones && renderActions(evento)}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-grit-muted">Fecha y hora</dt>
              <dd className="text-grit-subtext">{formatFechaHora(evento.fechaHora)}</dd>
              <dt className="text-grit-muted">Lugar</dt>
              <dd className="truncate text-grit-subtext">{evento.escenarioNombre ?? evento.puntoEncuentro ?? '—'}</dd>
              <dt className="text-grit-muted">Entrenador</dt>
              <dd className="truncate text-grit-subtext">{evento.entrenadorNombre ?? '—'}</dd>
              <dt className="text-grit-muted">Cupo</dt>
              <dd className="text-grit-subtext">{formatCupo(evento.cupoMaximo)}</dd>
              {!soloLectura && (
                <>
                  <dt className="text-grit-muted">Visibilidad</dt>
                  <dd className="text-grit-subtext">{evento.publico ? 'Público' : 'Privado'}</dd>
                  <dt className="text-grit-muted">Activo</dt>
                  <dd>
                    <EventoActivoBadge activo={evento.activo} />
                  </dd>
                </>
              )}
              <dt className="text-grit-muted">Estado</dt>
              <dd>
                <EventoEstadoBadge estado={evento.estado} borrador={evento.borrador} />
              </dd>
            </dl>
            {props.renderAcciones && <div className="mt-3 flex justify-end">{props.renderAcciones(evento)}</div>}
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="font-grit-body text-xs text-grit-subtext">
          Mostrando {start}–{end} de {totalFiltered} eventos
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="rounded-grit-xs border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-2 py-1 text-xs text-grit-subtext">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded-grit-xs border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
