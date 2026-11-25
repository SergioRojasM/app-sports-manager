'use client';

import { useMemo, useState } from 'react';
import {
  GritButton,
  GritChip,
  GritIcon,
  GritIconButton,
  GritIconTile,
  GritPagination,
  GritProgress,
  GritTag,
  cx,
  gritTableCellCompactClass,
  gritTableHeadCellCompactClass,
  gritTableHeadClass,
  gritTableRowClass,
} from '@/components/ui';
import {
  ESTADO_AGENDA_TAG,
  TONO_CLASES,
  diaDeInstancia,
  esLleno,
  findProximaId,
  formatCupo,
  formatDiaCorto,
  formatHora12,
  getDisciplinaTono,
  getEstadoAgenda,
  haIniciado,
  porcentajeCupo,
} from '@/lib/portal/entrenamientos-calendario';
import type { DisciplinaTono, TrainingCalendarItem, TrainingInstance } from '@/types/portal/entrenamientos.types';

export const LISTA_PAGE_SIZE = 20;

type EntrenamientosListProps = {
  /** Sessions of the visible week, in start order. */
  items: TrainingCalendarItem[];
  /** "Ver detalle del día" filter; null lists the whole week. */
  dayFilterKey: string | null;
  onClearDayFilter: () => void;
  tonos: Record<string, DisciplinaTono>;
  disciplineNameById: Record<string, string>;
  scenarioNameById: Record<string, string>;
  entrenadorNameById: Record<string, string>;
  todayKey: string;
  now: number;
  loading: boolean;
  canManage: boolean;
  onOpenTraining: (trainingId: string) => void;
  /** Direct booking (US-0127); only rendered for non-managers on upcoming, non-cancelled trainings. */
  onReservar: (trainingId: string) => void;
};

type Row = {
  item: TrainingCalendarItem;
  dia: string;
  hora: string;
  disciplina: string;
  escenario: string;
  entrenador: string;
  estado: ReturnType<typeof getEstadoAgenda>;
  showReservar: boolean;
};

function FormularioExterno({ instance }: { instance: TrainingInstance }) {
  if (!instance.formulario_externo) return null;
  return (
    <a
      href={instance.formulario_externo}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-grit-body text-[11px] font-medium text-grit-cyan hover:underline"
    >
      <GritIcon name="link" size={12} />
      Formulario externo{instance.formulario_obligatorio ? ' · Obligatorio' : ''}
    </a>
  );
}

function Cupo({ instance }: { instance: TrainingInstance }) {
  const pct = porcentajeCupo(instance);
  if (pct == null) {
    return <span className="font-grit-mono text-[11px] text-grit-subtext">{instance.reservas_activas ?? 0} reservas</span>;
  }
  return (
    <span className="flex items-center gap-2">
      <GritProgress
        value={pct}
        label={`Ocupación de ${instance.nombre}`}
        showValue={false}
        tone={esLleno(instance) ? 'warning' : 'accent'}
        trackClassName="w-14 shrink-0"
      />
      <span className="font-grit-mono text-[11px] font-semibold text-grit-text">{formatCupo(instance)}</span>
    </span>
  );
}

function Estado({ estado }: { estado: Row['estado'] }) {
  if (!estado) return <span className="text-grit-muted">—</span>;
  const tag = ESTADO_AGENDA_TAG[estado];
  return (
    <GritTag tone={tag.tone} dot>
      {tag.label}
    </GritTag>
  );
}

function Acciones({ row, onOpenTraining, onReservar }: { row: Row; onOpenTraining: (id: string) => void; onReservar: (id: string) => void }) {
  const { instance } = row.item;
  const lleno = esLleno(instance);
  return (
    <span className="flex items-center justify-end gap-2">
      {row.showReservar && (
        <GritButton
          size="sm"
          variant={lleno ? 'secondary' : 'outline-accent'}
          disabled={lleno}
          onClick={() => onReservar(instance.id)}
          aria-label={lleno ? `Cupo lleno: ${instance.nombre}` : `Reservar ${instance.nombre}`}
        >
          {lleno ? 'Cupo lleno' : 'Reservar'}
        </GritButton>
      )}
      <GritIconButton
        icon="more_horiz"
        label={`Opciones de ${instance.nombre}`}
        size="sm"
        variant="ghost"
        onClick={() => onOpenTraining(instance.id)}
      />
    </span>
  );
}

/**
 * List view of the trainings calendar (no v3 frame; kit table, DESIGN.md §9): the week's sessions,
 * 20 per page, optionally filtered to one day. Rows become stacked cards below `md`.
 * Mount it with a key of week + filter so pagination resets.
 */
export function EntrenamientosList({
  items,
  dayFilterKey,
  onClearDayFilter,
  tonos,
  disciplineNameById,
  scenarioNameById,
  entrenadorNameById,
  todayKey,
  now,
  loading,
  canManage,
  onOpenTraining,
  onReservar,
}: EntrenamientosListProps) {
  const [page, setPage] = useState(1);

  const rows = useMemo<Row[]>(() => {
    const filtrados = dayFilterKey ? items.filter((item) => diaDeInstancia(item.instance) === dayFilterKey) : items;
    const proximaId = findProximaId(
      items.filter((item) => diaDeInstancia(item.instance) === todayKey).map((item) => item.instance),
      now,
    );
    return filtrados.map((item) => {
      const { instance } = item;
      const dia = diaDeInstancia(instance);
      const estado = getEstadoAgenda(instance, now, proximaId);
      return {
        item,
        dia: dia ? formatDiaCorto(dia) : 'Sin fecha',
        hora: instance.fecha_hora ? formatHora12(instance.fecha_hora) : '',
        disciplina: disciplineNameById[instance.disciplina_id] ?? 'Sin disciplina',
        escenario: scenarioNameById[instance.escenario_id] ?? 'Sin escenario',
        entrenador: instance.entrenador_id ? entrenadorNameById[instance.entrenador_id] ?? 'Sin entrenador' : 'Sin entrenador',
        estado,
        showReservar: !canManage && estado !== 'cancelado' && !haIniciado(instance, now),
      };
    });
  }, [canManage, dayFilterKey, disciplineNameById, entrenadorNameById, items, now, scenarioNameById, todayKey]);

  const totalPages = Math.max(1, Math.ceil(rows.length / LISTA_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * LISTA_PAGE_SIZE, currentPage * LISTA_PAGE_SIZE);
  const first = rows.length === 0 ? 0 : (currentPage - 1) * LISTA_PAGE_SIZE + 1;
  const last = Math.min(currentPage * LISTA_PAGE_SIZE, rows.length);

  return (
    <div className="flex flex-col gap-4" aria-busy={loading || undefined}>
      {dayFilterKey && (
        <div className="flex flex-wrap items-center gap-2">
          <GritChip active icon="close" onClick={onClearDayFilter} aria-label={`Quitar filtro de día: ${formatDiaCorto(dayFilterKey)}`}>
            {formatDiaCorto(dayFilterKey)}
          </GritChip>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 font-grit-body text-xs text-grit-subtext">
          <GritIcon name="progress_activity" size={16} className="animate-spin text-grit-cyan" />
          Cargando entrenamientos…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <GritIconTile icon="event_busy" size={48} tone="accent" />
          <p className="font-grit-title text-base font-medium text-grit-text">
            {dayFilterKey ? 'No hay entrenamientos programados para este día' : 'No hay entrenamientos programados para esta semana'}
          </p>
        </div>
      ) : (
        <>
          {/* md+: table */}
          <div className="hidden overflow-hidden rounded-[16px] border border-white/[0.06] md:block">
            <table className="w-full table-fixed">
              <thead className={gritTableHeadClass}>
                <tr>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[13%]')}>Fecha</th>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[22%]')}>Entrenamiento</th>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[12%]')}>Disciplina</th>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[12%] max-xl:hidden')}>Escenario</th>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[12%] max-xl:hidden')}>Entrenador</th>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[12%]')}>Cupo</th>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[10%]')}>Estado</th>
                  <th scope="col" className={cx(gritTableHeadCellCompactClass, 'w-[12%] text-right')}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const { instance } = row.item;
                  const tono = TONO_CLASES[getDisciplinaTono(tonos, instance.disciplina_id)];
                  return (
                    <tr key={instance.id} className={gritTableRowClass}>
                      <td className={gritTableCellCompactClass}>
                        <span className="block">{row.dia}</span>
                        <span className="block font-grit-mono text-[11px] text-grit-muted">{row.hora}</span>
                      </td>
                      <td className={gritTableCellCompactClass}>
                        <span className={cx('block truncate font-semibold', row.estado === 'cancelado' && 'line-through')}>
                          {instance.nombre}
                        </span>
                        <span className="block truncate text-[11px] text-grit-muted">Serie: {row.item.groupName}</span>
                        <FormularioExterno instance={instance} />
                      </td>
                      <td className={cx(gritTableCellCompactClass, 'text-grit-subtext')}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden className={cx('h-[7px] w-[7px] shrink-0 rounded-full', tono.barra)} />
                          <span className="truncate">{row.disciplina}</span>
                        </span>
                      </td>
                      <td className={cx(gritTableCellCompactClass, 'truncate text-grit-subtext max-xl:hidden')}>{row.escenario}</td>
                      <td className={cx(gritTableCellCompactClass, 'truncate text-grit-subtext max-xl:hidden')}>{row.entrenador}</td>
                      <td className={gritTableCellCompactClass}>
                        <Cupo instance={instance} />
                      </td>
                      <td className={gritTableCellCompactClass}>
                        <Estado estado={row.estado} />
                      </td>
                      <td className={gritTableCellCompactClass}>
                        <Acciones row={row} onOpenTraining={onOpenTraining} onReservar={onReservar} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* < md: stacked cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {pageRows.map((row) => {
              const { instance } = row.item;
              const tono = TONO_CLASES[getDisciplinaTono(tonos, instance.disciplina_id)];
              return (
                <li key={instance.id} className="flex flex-col gap-2.5 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className={cx('h-3.5 w-[3px] shrink-0 rounded-sm', tono.barra)} />
                      <span className={cx('truncate font-grit-body text-[13px] font-semibold text-grit-text', row.estado === 'cancelado' && 'line-through')}>
                        {instance.nombre}
                      </span>
                    </div>
                    <Estado estado={row.estado} />
                  </div>
                  <p className="font-grit-body text-[11px] text-grit-subtext">
                    {row.dia} · {row.hora} · {row.disciplina}
                  </p>
                  <p className="font-grit-body text-[11px] text-grit-muted">
                    {row.escenario} · {row.entrenador}
                  </p>
                  <FormularioExterno instance={instance} />
                  <div className="flex items-center justify-between gap-2">
                    <Cupo instance={instance} />
                    <Acciones row={row} onOpenTraining={onOpenTraining} onReservar={onReservar} />
                  </div>
                </li>
              );
            })}
          </ul>

          <GritPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            summary={`${first}–${last} de ${rows.length} entrenamientos`}
          />
        </>
      )}
    </div>
  );
}
