'use client';

import { useEffect } from 'react';
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
  search: string;
  onChangeSearch: (value: string) => void;
  tenantId: string | null;
  onChangeTenantId: (tenantId: string | null) => void;
  tenantOptions: EventosTenantOption[];
  disciplina: string | null;
  onChangeDisciplina: (disciplina: string | null) => void;
  disciplinaOptions: string[];
  onClearFilters: () => void;
};

/** Filters drawer for /portal/eventos (US-0120), adapted from the public-trainings drawer. */
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
  search,
  onChangeSearch,
  tenantId,
  onChangeTenantId,
  tenantOptions,
  disciplina,
  onChangeDisciplina,
  disciplinaOptions,
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

  const selectClass =
    'w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 font-grit-body text-sm text-grit-text focus:border-grit-cyan focus:outline-none';

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
        aria-label="Filtrar eventos"
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto border-l border-grit-glass-border bg-grit-bg shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <h2 className="font-grit-title text-xl font-bold italic text-grit-text">Filtrar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-grit-md border border-grit-glass-border bg-grit-card p-2 text-grit-subtext transition hover:text-grit-text"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 p-5">
          <div className="grid grid-cols-2 gap-2">
            {DATE_CHIPS.map((chip) => {
              const chipRange = computeEventosChipRange(chip.value);
              const selected = dateFrom === chipRange.dateFrom && dateTo === chipRange.dateTo;
              return (
                <button
                  key={chip.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onApplyDateChip(chip.value)}
                  className={`rounded-grit-md border px-3 py-2 font-grit-body text-xs font-semibold transition ${
                    selected
                      ? 'border-grit-cyan bg-grit-cyan text-grit-bg'
                      : 'border-grit-glass-border bg-grit-card text-grit-subtext hover:border-grit-cyan/50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="h-px w-full bg-grit-glass-border" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onGoToPrevMonth}
                disabled={isPrevDisabled}
                aria-label="Mes anterior"
                className="rounded-grit-sm p-1 text-grit-subtext transition hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <span className="font-grit-body text-sm font-semibold capitalize text-grit-text">{monthLabel}</span>
              <button
                type="button"
                onClick={onGoToNextMonth}
                aria-label="Mes siguiente"
                className="rounded-grit-sm p-1 text-grit-subtext transition hover:text-grit-text"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="font-grit-body text-[11px] font-semibold text-grit-subtext">
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
                    className={`flex h-7 items-center justify-center rounded-grit-sm font-grit-body text-xs transition ${
                      isEndpoint
                        ? 'bg-grit-cyan font-bold text-grit-bg'
                        : isWithinRange
                          ? 'bg-grit-cyan/25 text-grit-text'
                          : cell.isToday
                            ? 'border border-grit-cyan text-grit-text'
                            : cell.disabled
                              ? 'cursor-not-allowed text-grit-subtext/30'
                              : 'text-grit-text hover:bg-grit-card'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-grit-body text-xs text-grit-subtext">{rangeSummary}</span>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={onClearDateRange}
                  className="font-grit-body text-xs font-semibold text-grit-cyan hover:underline"
                >
                  Limpiar fechas
                </button>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-grit-glass-border" />

          <div>
            <label htmlFor="eventos-publicos-tenant" className="mb-1.5 block font-grit-body text-xs font-semibold text-grit-subtext">
              Organización
            </label>
            <select
              id="eventos-publicos-tenant"
              value={tenantId ?? ''}
              onChange={(event) => onChangeTenantId(event.target.value || null)}
              className={selectClass}
            >
              <option value="">Todas</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="eventos-publicos-disciplina" className="mb-1.5 block font-grit-body text-xs font-semibold text-grit-subtext">
              Disciplina
            </label>
            <select
              id="eventos-publicos-disciplina"
              value={disciplina ?? ''}
              onChange={(event) => onChangeDisciplina(event.target.value || null)}
              className={selectClass}
            >
              <option value="">Todas</option>
              {disciplinaOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="eventos-publicos-search" className="mb-1.5 block font-grit-body text-xs font-semibold text-grit-subtext">
              Buscar evento
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-grit-subtext" aria-hidden="true">
                search
              </span>
              <input
                id="eventos-publicos-search"
                type="text"
                value={search}
                onChange={(event) => onChangeSearch(event.target.value)}
                placeholder="Nombre, organización, lugar..."
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card py-2 pl-9 pr-3 font-grit-body text-sm text-grit-text placeholder:text-grit-subtext/60 focus:border-grit-cyan focus:outline-none"
              />
            </div>
          </div>
        </div>

        <footer className="flex gap-2 border-t border-grit-glass-border px-5 py-4">
          <button
            type="button"
            onClick={onClearFilters}
            className="flex-1 rounded-grit-md border border-grit-glass-border px-4 py-2 font-grit-body text-sm font-semibold text-grit-text transition hover:border-grit-cyan/50"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-grit-md bg-grit-cyan px-4 py-2 font-grit-body text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan-light"
          >
            Ver resultados
          </button>
        </footer>
      </aside>
    </div>
  );
}
