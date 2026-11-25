'use client';

import { useEffect } from 'react';
import { GritButton, GritChip, GritIconButton, cx, gritFocusRing, gritSelectClass } from '@/components/ui';
import {
  computeEventosChipRange,
  dateKeyFromParts,
  todayKeyInBogota,
} from '@/lib/portal/eventos-publicos.utils';
import type { EventosCalendarMonth, EventosTenantOption } from '@/hooks/portal/eventos/useEventosPublicos';
import type { EventosPublicosDateChip } from '@/types/portal/eventos.types';

const DATE_CHIPS: { value: EventosPublicosDateChip; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'weekend', label: 'Fin de semana' },
];

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Date keys are calendar days, so they are formatted in UTC to avoid shifting by the browser's zone
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

type CalendarCell = {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateKey: string;
  disabled: boolean;
};

function keyToUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function buildCalendarDays({ year, month }: EventosCalendarMonth, todayKey: string): CalendarCell[] {
  // Monday-based offset
  const startOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: CalendarCell[] = [];

  for (let i = startOffset; i > 0; i -= 1) {
    const dateKey = dateKeyFromParts(year, month, 1 - i);
    cells.push({ day: keyToUtcDate(dateKey).getUTCDate(), isCurrentMonth: false, isToday: false, dateKey, disabled: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = dateKeyFromParts(year, month, day);
    cells.push({ day, isCurrentMonth: true, isToday: dateKey === todayKey, dateKey, disabled: dateKey < todayKey });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, isCurrentMonth: false, isToday: false, dateKey: dateKeyFromParts(year, month + 1, nextDay), disabled: true });
    nextDay += 1;
  }

  return cells;
}

type EventosPublicosFiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  dateFrom: string | null;
  dateTo: string | null;
  calendarMonth: EventosCalendarMonth;
  onGoToPrevMonth: () => void;
  onGoToNextMonth: () => void;
  onSetDateRange: (from: string | null, to: string | null) => void;
  onClearDateRange: () => void;
  onApplyDateChip: (chip: EventosPublicosDateChip) => void;
  tenantId: string | null;
  onChangeTenantId: (tenantId: string | null) => void;
  tenantOptions: EventosTenantOption[];
  onClearFilters: () => void;
};

/**
 * Filters drawer for /portal/eventos (US-0120): date range and organization. Search and discipline
 * live on the page itself (grit-arena-v3 frame `zY4v8`).
 */
export function EventosPublicosFiltersDrawer({
  open,
  onClose,
  dateFrom,
  dateTo,
  calendarMonth,
  onGoToPrevMonth,
  onGoToNextMonth,
  onSetDateRange,
  onClearDateRange,
  onApplyDateChip,
  tenantId,
  onChangeTenantId,
  tenantOptions,
  onClearFilters,
}: EventosPublicosFiltersDrawerProps) {
  const todayKey = todayKeyInBogota();
  const [todayYear, todayMonth] = todayKey.split('-').map(Number);
  const isPrevDisabled = calendarMonth.year === todayYear && calendarMonth.month === todayMonth - 1;
  const monthLabel = MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(calendarMonth.year, calendarMonth.month, 1)));
  const calendarDays = buildCalendarDays(calendarMonth, todayKey);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleDayClick = (dateKey: string) => {
    if (!dateFrom || dateTo) {
      onSetDateRange(dateKey, null);
      return;
    }

    if (dateKey >= dateFrom) {
      onSetDateRange(dateFrom, dateKey);
      return;
    }

    onSetDateRange(dateKey, null);
  };

  const rangeSummary = (() => {
    if (!dateFrom) return 'Todas las fechas próximas';
    if (!dateTo) return `Desde ${SHORT_DATE_FORMATTER.format(keyToUtcDate(dateFrom))}`;
    if (dateFrom === dateTo) return SHORT_DATE_FORMATTER.format(keyToUtcDate(dateFrom));
    return `${SHORT_DATE_FORMATTER.format(keyToUtcDate(dateFrom))} – ${SHORT_DATE_FORMATTER.format(keyToUtcDate(dateTo))}`;
  })();

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar filtros"
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="eventos-filtros-titulo"
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto border-l border-white/[0.10] bg-grit-glass shadow-[0_20px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 id="eventos-filtros-titulo" className="font-grit-title text-xl font-medium text-grit-text">
            Filtros
          </h2>
          <GritIconButton icon="close" label="Cerrar" onClick={onClose} />
        </header>

        <div className="flex flex-1 flex-col gap-5 p-5">
          <div role="group" aria-label="Fechas rápidas" className="grid grid-cols-2 gap-2">
            {DATE_CHIPS.map((chip) => {
              const chipRange = computeEventosChipRange(chip.value);
              const selected = dateFrom === chipRange.dateFrom && dateTo === chipRange.dateTo;
              return (
                <GritChip key={chip.value} active={selected} onClick={() => onApplyDateChip(chip.value)} className="justify-center">
                  {chip.label}
                </GritChip>
              );
            })}
          </div>

          <div className="h-px w-full bg-white/[0.06]" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <GritIconButton
                icon="chevron_left"
                label="Mes anterior"
                size="sm"
                variant="ghost"
                onClick={onGoToPrevMonth}
                disabled={isPrevDisabled}
              />
              <span className="font-grit-body text-sm font-semibold capitalize text-grit-text">{monthLabel}</span>
              <GritIconButton icon="chevron_right" label="Mes siguiente" size="sm" variant="ghost" onClick={onGoToNextMonth} />
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="font-grit-body text-[11px] font-semibold text-grit-muted">
                  {label}
                </span>
              ))}
              {calendarDays.map((cell, index) => {
                const isEndpoint = cell.dateKey === dateFrom || cell.dateKey === dateTo;
                const isWithinRange = !!dateFrom && !!dateTo && cell.dateKey > dateFrom && cell.dateKey < dateTo;

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={cell.disabled}
                    aria-disabled={cell.disabled}
                    tabIndex={cell.disabled ? -1 : 0}
                    aria-label={FULL_DATE_FORMATTER.format(keyToUtcDate(cell.dateKey))}
                    aria-pressed={isEndpoint}
                    onClick={() => handleDayClick(cell.dateKey)}
                    className={cx(
                      'flex h-8 items-center justify-center rounded-full font-grit-body text-xs transition',
                      gritFocusRing,
                      isEndpoint
                        ? 'bg-grit-cyan font-bold text-grit-on-brand'
                        : isWithinRange
                          ? 'bg-grit-cyan/[0.18] text-grit-text'
                          : cell.isToday
                            ? 'border border-grit-cyan/60 text-grit-text'
                            : cell.disabled
                              ? 'cursor-not-allowed text-grit-muted/40'
                              : 'text-grit-text hover:bg-white/[0.06]',
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-grit-body text-xs text-grit-subtext">{rangeSummary}</span>
              {(dateFrom || dateTo) && (
                <GritButton variant="ghost" size="sm" onClick={onClearDateRange}>
                  Limpiar fechas
                </GritButton>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-white/[0.06]" />

          <div>
            <label htmlFor="eventos-publicos-tenant" className="mb-1.5 block font-grit-body text-xs font-semibold text-grit-subtext">
              Organización
            </label>
            <select
              id="eventos-publicos-tenant"
              value={tenantId ?? ''}
              onChange={(event) => onChangeTenantId(event.target.value || null)}
              className={cx(gritSelectClass, 'grit-select-chevron')}
            >
              <option value="">Todas</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <footer className="flex gap-2 border-t border-white/[0.06] px-5 py-4">
          <GritButton variant="secondary" fullWidth onClick={onClearFilters} className="flex-1">
            Limpiar filtros
          </GritButton>
          <GritButton fullWidth onClick={onClose} className="flex-1">
            Ver resultados
          </GritButton>
        </footer>
      </aside>
    </div>
  );
}
