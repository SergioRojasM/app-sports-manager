import {
  GritCard,
  GritPagination,
  GritTag,
  cx,
  gritTableCellCompactClass as gritTableCellClass,
  gritTableHeadCellCompactClass as gritTableHeadCellClass,
  gritTableHeadClass,
  gritTableRowClass,
} from '@/components/ui';
import { formatCupo, formatEventoFecha } from '@/lib/portal/eventos.utils';
import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import { EventoActionsMenu } from './EventoActionsMenu';
import { EventoActivoBadge } from './EventoActivoBadge';
import { EventoEstadoBadge } from './EventoEstadoBadge';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type EventosTableProps = {
  eventos: EventoListItem[];
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEditar: (evento: EventoListItem) => void;
  onCambiarEstado: (evento: EventoListItem, target: EventoEstado) => void;
  onEliminar: (evento: EventoListItem) => void;
  onCambiarActivo: (evento: EventoListItem) => void;
  onVerCompras: (evento: EventoListItem) => void;
  onControlIngreso: (evento: EventoListItem) => void;
  onDuplicar: (evento: EventoListItem) => void;
};

const COLUMNS = ['Evento', 'Fecha y hora', 'Lugar', 'Entrenador', 'Cupo', 'Visibilidad', 'Activo', 'Estado'];

function formatFechaHora(fechaHora: string | null): string {
  return fechaHora ? `${formatEventoFecha(fechaHora)} · ${formatHoraCorta(fechaHora)}` : formatEventoFecha(null);
}

function VisibilidadTag({ publico }: { publico: boolean }) {
  return (
    <GritTag tone="neutral" icon={publico ? 'public' : 'lock'}>
      {publico ? 'Público' : 'Privado'}
    </GritTag>
  );
}

export function EventosTableSkeleton() {
  return (
    <div aria-hidden="true">
      <GritCard variant="card" padding="sm" className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-grit-lg bg-white/[0.04]" />
        ))}
      </GritCard>
    </div>
  );
}

/** "Lista" view (no v3 frame): DESIGN.md §9 table pattern — kit table classes, tags and pagination. */
export function EventosTable({
  eventos,
  currentPage,
  totalPages,
  totalFiltered,
  pageSize,
  onPageChange,
  ...actions
}: EventosTableProps) {
  const start = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);
  const summary = `Mostrando ${start}–${end} de ${totalFiltered} eventos`;

  const menu = (evento: EventoListItem) => (
    <EventoActionsMenu
      eventoNombre={evento.nombre}
      estado={evento.estado}
      borrador={evento.borrador}
      activo={evento.activo}
      onCambiarActivo={() => actions.onCambiarActivo(evento)}
      onVerCompras={() => actions.onVerCompras(evento)}
      onControlIngreso={() => actions.onControlIngreso(evento)}
      onDuplicar={() => actions.onDuplicar(evento)}
      onEditar={() => actions.onEditar(evento)}
      onCambiarEstado={(target) => actions.onCambiarEstado(evento, target)}
      onEliminar={() => actions.onEliminar(evento)}
    />
  );

  return (
    <GritCard variant="card" padding="none" className="overflow-hidden">
      {/* md and up: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className={gritTableHeadClass}>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className={gritTableHeadCellClass}>
                  {column}
                </th>
              ))}
              <th scope="col" className={cx(gritTableHeadCellClass, 'text-right')}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento) => {
              const cancelado = !evento.borrador && evento.estado === 'cancelado';
              return (
                <tr key={evento.id} className={gritTableRowClass}>
                  <td className={cx(gritTableCellClass, 'max-w-[180px]')}>
                    <div className={cx('truncate font-semibold', cancelado ? 'text-grit-muted' : 'text-grit-text')} title={evento.nombre}>
                      {evento.nombre}
                    </div>
                    <div className="truncate text-[11px] text-grit-muted">{evento.disciplinaNombre ?? 'Sin disciplina'}</div>
                  </td>
                  <td className={cx(gritTableCellClass, 'whitespace-nowrap text-xs text-grit-subtext')}>
                    {evento.fechaHora ? (
                      <>
                        <div>{formatEventoFecha(evento.fechaHora)}</div>
                        <div className="text-[11px] text-grit-muted">{formatHoraCorta(evento.fechaHora)}</div>
                      </>
                    ) : (
                      formatEventoFecha(null)
                    )}
                  </td>
                  <td className={cx(gritTableCellClass, 'max-w-[120px] truncate text-grit-subtext')}>
                    {evento.escenarioNombre ?? evento.puntoEncuentro ?? '—'}
                  </td>
                  <td className={cx(gritTableCellClass, 'max-w-[110px] truncate text-grit-subtext')}>
                    {evento.entrenadorNombre ?? '—'}
                  </td>
                  <td className={cx(gritTableCellClass, 'whitespace-nowrap text-grit-subtext')}>
                    {evento.cupoMaximo ?? 'Ilimitado'}
                  </td>
                  <td className={gritTableCellClass}>
                    <VisibilidadTag publico={evento.publico} />
                  </td>
                  <td className={gritTableCellClass}>
                    <EventoActivoBadge activo={evento.activo} />
                  </td>
                  <td className={gritTableCellClass}>
                    <EventoEstadoBadge estado={evento.estado} borrador={evento.borrador} />
                  </td>
                  <td className={gritTableCellClass}>
                    <div className="flex justify-end">{menu(evento)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* below md: stacked rows */}
      <ul className="divide-y divide-white/[0.06] md:hidden">
        {eventos.map((evento) => (
          <li key={evento.id} className="p-4 font-grit-body">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={cx(
                    'truncate text-[13px] font-semibold',
                    !evento.borrador && evento.estado === 'cancelado' ? 'text-grit-muted' : 'text-grit-text',
                  )}
                >
                  {evento.nombre}
                </p>
                <p className="text-[11px] text-grit-muted">{evento.disciplinaNombre ?? 'Sin disciplina'}</p>
              </div>
              {menu(evento)}
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-grit-muted">Fecha y hora</dt>
              <dd className="text-grit-subtext">{formatFechaHora(evento.fechaHora)}</dd>
              <dt className="text-grit-muted">Lugar</dt>
              <dd className="truncate text-grit-subtext">{evento.escenarioNombre ?? evento.puntoEncuentro ?? '—'}</dd>
              <dt className="text-grit-muted">Entrenador</dt>
              <dd className="truncate text-grit-subtext">{evento.entrenadorNombre ?? '—'}</dd>
              <dt className="text-grit-muted">Cupo</dt>
              <dd className="text-grit-subtext">{formatCupo(evento.cupoMaximo)}</dd>
              <dt className="text-grit-muted">Visibilidad</dt>
              <dd>
                <VisibilidadTag publico={evento.publico} />
              </dd>
              <dt className="text-grit-muted">Activo</dt>
              <dd>
                <EventoActivoBadge activo={evento.activo} />
              </dd>
              <dt className="text-grit-muted">Estado</dt>
              <dd>
                <EventoEstadoBadge estado={evento.estado} borrador={evento.borrador} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <GritPagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          summary={summary}
          className="border-t border-white/[0.06]"
        />
      ) : (
        <p className="border-t border-white/[0.06] px-[22px] py-3 font-grit-body text-[11px] text-grit-muted">{summary}</p>
      )}
    </GritCard>
  );
}
