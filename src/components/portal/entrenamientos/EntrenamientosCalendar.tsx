import { useMemo } from 'react';
import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import { MAX_PILLS_PER_DAY, buildCalendarCells } from '@/lib/portal/gestion-eventos-calendario';
import {
  TONO_CANCELADO,
  TONO_CLASES,
  diaDeInstancia,
  esCancelado,
  formatDiaMes,
  formatHora12,
  formatHoraCorta,
  getDisciplinaTono,
} from '@/lib/portal/entrenamientos-calendario';
import type { DisciplinaTono, TrainingCalendarItem } from '@/types/portal/entrenamientos.types';

type EntrenamientosCalendarProps = {
  monthStartDate: string;
  items: TrainingCalendarItem[];
  tonos: Record<string, DisciplinaTono>;
  selectedDateKey: string | null;
  todayKey: string;
  loading: boolean;
  onSelectDate: (dateKey: string) => void;
  onOpenTraining: (trainingId: string) => void;
};

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const CELL_BASE = 'relative flex min-h-[72px] flex-col gap-1.5 rounded-[14px] border p-1.5 sm:min-h-[95px] sm:p-2';

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Month view of the trainings calendar (no v3 frame; composed after `ZYxt2` `h7Ok29`): 42 Monday-first
 * cells, ≤ 2 discipline-tone pills per day + "+N". The cell selects the day; a pill opens the session.
 */
export function EntrenamientosCalendar({
  monthStartDate,
  items,
  tonos,
  selectedDateKey,
  todayKey,
  loading,
  onSelectDate,
  onOpenTraining,
}: EntrenamientosCalendarProps) {
  const cells = useMemo(() => buildCalendarCells(monthStartDate), [monthStartDate]);
  const porDia = useMemo(() => {
    const map = new Map<string, TrainingCalendarItem[]>();
    for (const item of items) {
      const key = diaDeInstancia(item.instance);
      if (key) map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  return (
    <div className="flex flex-col gap-1.5" aria-busy={loading || undefined}>
      <div className="grid grid-cols-7 gap-1 py-1 sm:gap-1.5" aria-hidden>
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

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return (
              <div key={cell.dateKey} aria-hidden className={cx(CELL_BASE, 'border-white/[0.03]')}>
                <span className="font-grit-body text-[11px] font-semibold text-grit-muted/50">{cell.dayNumber}</span>
              </div>
            );
          }

          if (loading) {
            return <div key={cell.dateKey} aria-hidden className={cx(CELL_BASE, 'animate-pulse border-white/[0.06] bg-white/[0.03]')} />;
          }

          const dayItems = porDia.get(cell.dateKey) ?? [];
          const visibles = dayItems.slice(0, MAX_PILLS_PER_DAY);
          const overflow = dayItems.length - visibles.length;
          const isToday = cell.dateKey === todayKey;
          const isSelected = cell.dateKey === selectedDateKey;

          return (
            <div
              key={cell.dateKey}
              className={cx(
                CELL_BASE,
                'transition-colors',
                isSelected ? 'bg-grit-cyan/[0.08]' : cell.isWeekend ? 'bg-black/[0.12]' : 'bg-white/[0.028]',
                isToday
                  ? 'border-grit-cyan/50 shadow-[0_0_18px_rgba(20,219,196,0.15)]'
                  : isSelected
                    ? 'border-grit-cyan/35'
                    : 'border-white/[0.06] hover:bg-white/[0.05]',
              )}
            >
              {/* Selects the day; pills sit above it as their own buttons (no nested interactive elements). */}
              <button
                type="button"
                onClick={() => onSelectDate(cell.dateKey)}
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${formatDiaMes(cell.dateKey)}, ${plural(dayItems.length, 'sesión', 'sesiones')}`}
                className={cx('absolute inset-0 rounded-[14px]', gritFocusRing)}
              />
              <span
                className={cx(
                  'pointer-events-none relative font-grit-body text-[11px] font-semibold',
                  isToday ? 'text-grit-cyan' : 'text-grit-subtext',
                )}
              >
                {cell.dayNumber}
              </span>

              {visibles.length > 0 && (
                <span className="relative hidden min-w-0 flex-col gap-1 sm:flex">
                  {visibles.map(({ instance }) => {
                    const cancelado = esCancelado(instance);
                    const clases = cancelado ? TONO_CANCELADO : TONO_CLASES[getDisciplinaTono(tonos, instance.disciplina_id)];
                    const hora = instance.fecha_hora ? formatHoraCorta(instance.fecha_hora) : '';
                    return (
                      <button
                        key={instance.id}
                        type="button"
                        onClick={() => onOpenTraining(instance.id)}
                        aria-label={`${instance.nombre}, ${instance.fecha_hora ? formatHora12(instance.fecha_hora) : 'sin hora'}${cancelado ? ', cancelado' : ''}`}
                        className={cx(
                          'relative flex min-w-0 items-center gap-1 overflow-hidden rounded-[8px] py-1 pl-2 pr-1.5 text-left font-grit-body text-[10px] leading-tight transition-colors',
                          gritFocusRing,
                          clases.pill,
                          cancelado && 'opacity-70',
                        )}
                      >
                        <span aria-hidden className={cx('absolute inset-y-0 left-0 w-[3px]', clases.barra)} />
                        <span className="shrink-0 font-grit-mono text-[9px] text-grit-subtext">{hora}</span>
                        <span className={cx('truncate font-semibold text-grit-text', cancelado && 'line-through')}>
                          {instance.nombre}
                        </span>
                      </button>
                    );
                  })}
                </span>
              )}

              {/* Below sm the pills collapse to dots */}
              {dayItems.length > 0 && (
                <span aria-hidden className="pointer-events-none relative flex flex-wrap gap-1 sm:hidden">
                  {dayItems.map(({ instance }) => (
                    <span
                      key={instance.id}
                      className={cx(
                        'h-1.5 w-1.5 rounded-full',
                        esCancelado(instance) ? TONO_CANCELADO.barra : TONO_CLASES[getDisciplinaTono(tonos, instance.disciplina_id)].barra,
                      )}
                    />
                  ))}
                </span>
              )}

              {overflow > 0 && (
                <span aria-hidden className="pointer-events-none relative hidden font-grit-body text-[11px] font-semibold text-grit-subtext sm:inline">
                  +{overflow}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!loading && !Array.from(porDia.keys()).some((key) => key.startsWith(monthStartDate.slice(0, 7))) && (
        <p className="flex items-center gap-2 pt-2 font-grit-body text-[13px] text-grit-subtext">
          <GritIcon name="event_busy" size={16} className="text-grit-muted" />
          No hay entrenamientos programados para este mes.
        </p>
      )}
    </div>
  );
}
