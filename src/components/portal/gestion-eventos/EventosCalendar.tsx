import type { ReactNode } from 'react';
import { GritAlert, GritButton, GritCard, GritIconButton, cx } from '@/components/ui';
import { formatDateKeyLabel, toDateKeyInBogota } from '@/lib/portal/eventos.utils';
import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import { buildCalendarCells } from '@/lib/portal/gestion-eventos-calendario';
import { EventoActionsMenu } from './EventoActionsMenu';
import { EventoActivoBadge } from './EventoActivoBadge';
import { EventoEstadoBadge } from './EventoEstadoBadge';
import { EventosCalendarDayCell } from './EventosCalendarDayCell';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type EventosCalendarProps = {
  monthLabel: string;
  monthStartDate: string;
  eventosByDate: Record<string, EventoListItem[]>;
  selectedDateKey: string | null;
  selectedDayEventos: EventoListItem[];
  undatedCount: number;
  loading: boolean;
  error: string | null;
  isCurrentMonth: boolean;
  /** Estado + Disciplina pill selects rendered in the calendar header. */
  filters: ReactNode;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectDate: (dateKey: string) => void;
  onRetry: () => void;
  onShowUndated: () => void;
  onEditar: (evento: EventoListItem) => void;
  onCambiarEstado: (evento: EventoListItem, target: EventoEstado) => void;
  onEliminar: (evento: EventoListItem) => void;
  onCambiarActivo: (evento: EventoListItem) => void;
  onVerCompras: (evento: EventoListItem) => void;
  onControlIngreso: (evento: EventoListItem) => void;
  onDuplicar: (evento: EventoListItem) => void;
};

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

/** Month calendar card of "Gestiona tus eventos." (grit-arena-v3 `ZYxt2` `zVKas`) + the selected day's list. */
export function EventosCalendar({
  monthLabel,
  monthStartDate,
  eventosByDate,
  selectedDateKey,
  selectedDayEventos,
  undatedCount,
  loading,
  error,
  isCurrentMonth,
  filters,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onSelectDate,
  onRetry,
  onShowUndated,
  onEditar,
  onCambiarEstado,
  onEliminar,
  onCambiarActivo,
  onVerCompras,
  onControlIngreso,
  onDuplicar,
}: EventosCalendarProps) {
  const cells = buildCalendarCells(monthStartDate);
  const todayKey = toDateKeyInBogota(new Date());

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <GritCard variant="card" padding="none" className="flex flex-col gap-3 px-3 py-4 sm:px-5 sm:py-[18px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <GritIconButton icon="chevron_left" label="Mes anterior" size="sm" onClick={onPreviousMonth} />
            <GritIconButton icon="chevron_right" label="Mes siguiente" size="sm" onClick={onNextMonth} />
            <h2 className="font-grit-title text-xl font-medium text-grit-text" aria-live="polite">
              {monthLabel.replace(' de ', ' ')}
            </h2>
            <GritButton
              variant={isCurrentMonth ? 'outline-accent' : 'secondary'}
              size="sm"
              onClick={onToday}
              aria-label="Ir al mes actual"
            >
              Hoy
            </GritButton>
          </div>
          {filters}
        </header>

        {error ? (
          <GritAlert
            tone="danger"
            action={
              <GritButton variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
                Reintentar
              </GritButton>
            }
          >
            {error}
          </GritAlert>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 py-1 sm:gap-1.5" aria-hidden="true">
              {WEEKDAYS.map((label, index) => (
                <span
                  key={label}
                  className={cx(
                    'px-1 font-grit-body text-[10px] font-semibold tracking-[1.4px] sm:px-2.5',
                    index >= 5 ? 'text-grit-muted' : 'text-grit-subtext',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5" aria-busy={loading || undefined}>
              {cells.map((cell) => (
                <EventosCalendarDayCell
                  key={cell.dateKey}
                  cell={cell}
                  eventos={eventosByDate[cell.dateKey] ?? []}
                  isToday={cell.dateKey === todayKey}
                  isSelected={cell.dateKey === selectedDateKey}
                  loading={loading}
                  onSelect={onSelectDate}
                />
              ))}
            </div>
          </>
        )}

        {undatedCount > 0 && (
          <p className="border-t border-white/[0.06] pt-3 font-grit-body text-xs text-grit-muted">
            <button
              type="button"
              onClick={onShowUndated}
              className="rounded-grit-sm font-semibold text-grit-cyan hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan/70"
            >
              {undatedCount === 1 ? '1 evento sin fecha' : `${undatedCount} eventos sin fecha`}
            </button>{' '}
            no aparece{undatedCount === 1 ? '' : 'n'} en el calendario.
          </p>
        )}
      </GritCard>

      {selectedDateKey && !loading && !error && (
        <GritCard variant="card" padding="md" as="section">
          <h3 className="mb-2 font-grit-title text-[17px] font-medium text-grit-text">
            Eventos del {formatDateKeyLabel(selectedDateKey)}
          </h3>
          {selectedDayEventos.length === 0 ? (
            <p className="font-grit-body text-[13px] text-grit-muted">No hay eventos este día.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {selectedDayEventos.map((evento) => {
                const cancelado = !evento.borrador && evento.estado === 'cancelado';
                return (
                  <li key={evento.id} className="flex flex-wrap items-center gap-3 py-3 font-grit-body sm:flex-nowrap">
                    <span className="w-16 shrink-0 font-grit-mono text-[11px] text-grit-muted">
                      {formatHoraCorta(evento.fechaHora)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cx('truncate text-[13px] font-semibold', cancelado ? 'text-grit-muted' : 'text-grit-text')}>
                        {evento.nombre}
                      </p>
                      <p className="truncate text-[11px] text-grit-muted">{evento.disciplinaNombre ?? 'Sin disciplina'}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <EventoActivoBadge activo={evento.activo} />
                      <EventoEstadoBadge estado={evento.estado} borrador={evento.borrador} />
                    </div>
                    <EventoActionsMenu
                      eventoNombre={evento.nombre}
                      estado={evento.estado}
                      borrador={evento.borrador}
                      activo={evento.activo}
                      onCambiarActivo={() => onCambiarActivo(evento)}
                      onVerCompras={() => onVerCompras(evento)}
                      onControlIngreso={() => onControlIngreso(evento)}
                      onDuplicar={() => onDuplicar(evento)}
                      onEditar={() => onEditar(evento)}
                      onCambiarEstado={(target) => onCambiarEstado(evento, target)}
                      onEliminar={() => onEliminar(evento)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </GritCard>
      )}
    </div>
  );
}
