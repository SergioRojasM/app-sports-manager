import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import { formatDateKeyLabel, formatEventoHora, toDateKeyInBogota } from '@/lib/portal/eventos.utils';
import { EventoActionsMenu } from './EventoActionsMenu';
import { EventoActivoBadge } from './EventoActivoBadge';
import { EventoEstadoBadge } from './EventoEstadoBadge';
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
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateKey: string) => void;
  onRetry: () => void;
  onShowUndated: () => void;
  onEditar: (evento: EventoListItem) => void;
  onCambiarEstado: (evento: EventoListItem, target: EventoEstado) => void;
  onEliminar: (evento: EventoListItem) => void;
  onCambiarActivo: (evento: EventoListItem) => void;
  onVerCompras: (evento: EventoListItem) => void;
  onDuplicar: (evento: EventoListItem) => void;
};

type CalendarCell = {
  key: string;
  dayNumber: number | null;
  dateKey: string | null;
};

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_CHIPS_PER_DAY = 3;
const DISCIPLINE_COLOR_PALETTE = [
  'bg-cyan-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-rose-400',
  'bg-sky-400',
  'bg-lime-400',
  'bg-fuchsia-400',
];

/** Monday-first month grid, same layout as EntrenamientosCalendar. */
function buildMonthCells(monthStartDate: string): CalendarCell[] {
  const monthStart = new Date(`${monthStartDate}T00:00:00.000Z`);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstDayMondayIndex = (monthStart.getUTCDay() + 6) % 7;

  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstDayMondayIndex; index += 1) {
    cells.push({ key: `empty-start-${index}`, dayNumber: null, dateKey: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
    cells.push({ key: dateKey, dayNumber: day, dateKey });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, dayNumber: null, dateKey: null });
  }

  return cells;
}

function eventCountLabel(eventos: EventoListItem[]): string {
  const count = eventos.length;
  if (count === 0) return 'sin eventos';
  const inactivos = eventos.filter((evento) => !evento.activo).length;
  const base = count === 1 ? '1 evento' : `${count} eventos`;
  if (inactivos === 0) return base;
  return `${base}, ${inactivos === 1 ? '1 inactivo' : `${inactivos} inactivos`}`;
}

export function EventosCalendar({
  monthLabel,
  monthStartDate,
  eventosByDate,
  selectedDateKey,
  selectedDayEventos,
  undatedCount,
  loading,
  error,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
  onRetry,
  onShowUndated,
  onEditar,
  onCambiarEstado,
  onEliminar,
  onCambiarActivo,
  onVerCompras,
  onDuplicar,
}: EventosCalendarProps) {
  const monthCells = buildMonthCells(monthStartDate);
  const todayKey = toDateKeyInBogota(new Date());

  const disciplineIds = Array.from(
    new Set(Object.values(eventosByDate).flat().map((evento) => evento.disciplinaNombre ?? '')),
  ).sort((left, right) => left.localeCompare(right));

  const colorByDisciplineId = disciplineIds.reduce<Record<string, string>>((accumulator, disciplineId, index) => {
    accumulator[disciplineId] = DISCIPLINE_COLOR_PALETTE[index % DISCIPLINE_COLOR_PALETTE.length];
    return accumulator;
  }, {});

  return (
    <div className="space-y-4">
      <section className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-4 backdrop-blur-md">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-grit-title text-lg font-semibold text-grit-text">{monthLabel}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPreviousMonth}
              aria-label="Mes anterior"
              className={cx(
                'flex h-9 w-9 items-center justify-center rounded-grit-md border border-grit-glass-border bg-grit-bg/80 text-grit-text transition hover:border-grit-cyan/40',
                gritFocusRing,
              )}
            >
              <GritIcon name="chevron_left" size={18} />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Mes siguiente"
              className={cx(
                'flex h-9 w-9 items-center justify-center rounded-grit-md border border-grit-glass-border bg-grit-bg/80 text-grit-text transition hover:border-grit-cyan/40',
                gritFocusRing,
              )}
            >
              <GritIcon name="chevron_right" size={18} />
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-4">
            <p className="text-sm text-grit-danger">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-grit-md border border-grit-danger/30 px-3 py-2 text-xs font-semibold text-grit-danger"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 border-b border-grit-glass-border pb-2 sm:gap-2">
              {WEEKDAY_HEADERS.map((label) => (
                <p key={label} className="text-center text-[11px] font-semibold uppercase tracking-wider text-grit-subtext">
                  {label}
                </p>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2" aria-busy={loading || undefined}>
              {monthCells.map((cell) => {
                if (!cell.dateKey || !cell.dayNumber) {
                  return <div key={cell.key} aria-hidden="true" />;
                }

                if (loading) {
                  return <div key={cell.key} className="min-h-[88px] animate-pulse rounded-grit-md bg-grit-card" />;
                }

                const dayEventos = eventosByDate[cell.dateKey] ?? [];
                const visible = dayEventos.slice(0, MAX_CHIPS_PER_DAY);
                const overflow = dayEventos.length - visible.length;
                const isSelected = cell.dateKey === selectedDateKey;
                const isToday = cell.dateKey === todayKey;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => onSelectDate(cell.dateKey as string)}
                    aria-pressed={isSelected}
                    aria-label={`${formatDateKeyLabel(cell.dateKey)}, ${eventCountLabel(dayEventos)}`}
                    className={cx(
                      'flex min-h-[88px] flex-col items-stretch gap-1 rounded-grit-md border p-1.5 text-left transition sm:p-2',
                      gritFocusRing,
                      isSelected
                        ? 'border-grit-cyan/80 bg-grit-bg/70 ring-1 ring-grit-cyan/40'
                        : 'border-grit-glass-border bg-grit-bg/50 hover:border-grit-cyan/40 hover:bg-grit-bg/65',
                    )}
                  >
                    <span className={cx('text-xs font-semibold', isToday ? 'text-grit-cyan' : 'text-grit-subtext')}>
                      {cell.dayNumber}
                    </span>
                    {visible.map((evento) => (
                      <span
                        key={evento.id}
                        className="flex min-w-0 items-center gap-1 text-[10px] leading-tight text-grit-text"
                        aria-hidden="true"
                      >
                        <span
                          className={cx(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            evento.borrador
                              ? 'border border-dashed border-grit-subtext'
                              : colorByDisciplineId[evento.disciplinaNombre ?? ''] ?? 'bg-grit-subtext/40',
                          )}
                        />
                        <span
                          className={cx(
                            'hidden truncate sm:inline',
                            !evento.borrador && evento.estado === 'cancelado' && 'text-grit-muted line-through',
                            evento.borrador && 'italic text-grit-subtext',
                            !evento.activo && 'text-amber-300',
                          )}
                        >
                          {evento.nombre}
                        </span>
                        {!evento.activo && (
                          <GritIcon name="visibility_off" size={11} className="shrink-0 text-amber-300" />
                        )}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span className="text-[10px] font-semibold text-grit-cyan" aria-hidden="true">
                        +{overflow}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {undatedCount > 0 && (
          <p className="mt-4 border-t border-grit-glass-border pt-3 font-grit-body text-xs text-grit-subtext">
            <button type="button" onClick={onShowUndated} className="font-semibold text-grit-cyan hover:underline">
              {undatedCount === 1 ? '1 evento sin fecha' : `${undatedCount} eventos sin fecha`}
            </button>{' '}
            no aparece{undatedCount === 1 ? '' : 'n'} en el calendario.
          </p>
        )}
      </section>

      {selectedDateKey && !loading && !error && (
        <section className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-4 backdrop-blur-md">
          <h3 className="mb-3 font-grit-title text-base font-semibold text-grit-text">
            Eventos del {formatDateKeyLabel(selectedDateKey)}
          </h3>
          {selectedDayEventos.length === 0 ? (
            <p className="font-grit-body text-sm text-grit-subtext">No hay eventos este día.</p>
          ) : (
            <ul className="divide-y divide-grit-glass-border">
              {selectedDayEventos.map((evento) => (
                <li key={evento.id} className="flex items-center gap-3 py-2.5 font-grit-body">
                  <span className="w-20 shrink-0 text-xs text-grit-subtext">{formatEventoHora(evento.fechaHora)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cx('truncate text-sm font-semibold', evento.estado === 'cancelado' ? 'text-grit-muted' : 'text-grit-text')}>
                      {evento.nombre}
                    </p>
                    <p className="truncate text-xs text-grit-subtext">{evento.disciplinaNombre ?? 'Sin disciplina'}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
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
                    onDuplicar={() => onDuplicar(evento)}
                    onEditar={() => onEditar(evento)}
                    onCambiarEstado={(target) => onCambiarEstado(evento, target)}
                    onEliminar={() => onEliminar(evento)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
