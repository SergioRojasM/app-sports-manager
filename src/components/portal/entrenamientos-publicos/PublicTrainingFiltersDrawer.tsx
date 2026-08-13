'use client';

import { useEffect } from 'react';
import { computeChipRange, toDateKey } from '@/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace';
import type { PublicTrainingDateChip } from '@/types/portal/entrenamientos-publicos.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';

const DATE_CHIPS: { value: PublicTrainingDateChip; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'weekend', label: 'Fin de semana' },
];

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

type CalendarMonth = { year: number; month: number };

type CalendarCell = {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateKey: string;
  disabled: boolean;
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(dateKey: string): string {
  return SHORT_DATE_FORMATTER.format(parseDateKey(dateKey));
}

function formatFullDate(dateKey: string): string {
  return FULL_DATE_FORMATTER.format(parseDateKey(dateKey));
}

function buildCalendarDays(calendarMonth: CalendarMonth): CalendarCell[] {
  const { year, month } = calendarMonth;
  const firstOfMonth = new Date(year, month, 1);
  // Monday-based offset
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(new Date());

  const cells: CalendarCell[] = [];

  for (let i = startOffset; i > 0; i -= 1) {
    const day = daysInPrevMonth - i + 1;
    cells.push({ day, isCurrentMonth: false, isToday: false, dateKey: toDateKey(new Date(year, month - 1, day)), disabled: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(new Date(year, month, day));
    cells.push({
      day,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      dateKey,
      disabled: dateKey < todayKey,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      day: nextDay,
      isCurrentMonth: false,
      isToday: false,
      dateKey: toDateKey(new Date(year, month + 1, nextDay)),
      disabled: true,
    });
    nextDay += 1;
  }

  return cells;
}

type PublicTrainingFiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  dateFrom: string | null;
  dateTo: string | null;
  calendarMonth: CalendarMonth;
  onGoToPrevMonth: () => void;
  onGoToNextMonth: () => void;
  onSetDateRange: (from: string | null, to: string | null) => void;
  onClearDateRange: () => void;
  onApplyDateChip: (chip: PublicTrainingDateChip) => void;
  search: string;
  onChangeSearch: (value: string) => void;
  tenantId: string | null;
  onChangeTenantId: (tenantId: string | null) => void;
  tenantOptions: SelectOption[];
};

export function PublicTrainingFiltersDrawer({
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
}: PublicTrainingFiltersDrawerProps) {
  const now = new Date();
  const isPrevDisabled = calendarMonth.year === now.getFullYear() && calendarMonth.month === now.getMonth();
  const monthLabel = MONTH_LABEL_FORMATTER.format(new Date(calendarMonth.year, calendarMonth.month, 1));
  const calendarDays = buildCalendarDays(calendarMonth);

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
    if (!dateTo) return `Desde ${formatShortDate(dateFrom)}`;
    if (dateFrom === dateTo) return formatShortDate(dateFrom);
    return `${formatShortDate(dateFrom)} – ${formatShortDate(dateTo)}`;
  })();

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar filtros"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filtrar entrenamientos"
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto border-l border-landing-border bg-landing-bg shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-landing-border px-5 py-4">
          <h2 className="font-landing-display text-xl italic font-bold text-landing-text">Filtrar</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-landing-border bg-landing-surface-elevated/60 p-2 text-landing-text-secondary transition hover:text-landing-text"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 p-5">
          <div className="grid grid-cols-2 gap-2">
            {DATE_CHIPS.map((chip) => {
              const chipRange = computeChipRange(chip.value);
              const selected = dateFrom === chipRange.dateFrom && dateTo === chipRange.dateTo;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => onApplyDateChip(chip.value)}
                  className={`rounded-lg border px-3 py-2 font-landing-body text-xs font-semibold transition ${
                    selected
                      ? 'border-landing-primary bg-landing-primary text-landing-bg'
                      : 'border-landing-border bg-landing-surface-card/60 text-landing-text-secondary hover:border-landing-primary/50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="h-px w-full bg-landing-border" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onGoToPrevMonth}
                disabled={isPrevDisabled}
                aria-label="Mes anterior"
                className="rounded-md p-1 text-landing-text-secondary transition hover:text-landing-text disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <span className="font-landing-body text-sm font-semibold capitalize text-landing-text">{monthLabel}</span>
              <button
                type="button"
                onClick={onGoToNextMonth}
                aria-label="Mes siguiente"
                className="rounded-md p-1 text-landing-text-secondary transition hover:text-landing-text"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="font-landing-body text-[11px] font-semibold text-landing-text-secondary">
                  {label}
                </span>
              ))}
              {calendarDays.map((cell, index) => {
                const isEndpoint = cell.dateKey === dateFrom || cell.dateKey === dateTo;
                const isWithinRange =
                  !!dateFrom && !!dateTo && cell.dateKey > dateFrom && cell.dateKey < dateTo;

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={cell.disabled}
                    aria-disabled={cell.disabled}
                    tabIndex={cell.disabled ? -1 : 0}
                    aria-label={formatFullDate(cell.dateKey)}
                    onClick={() => handleDayClick(cell.dateKey)}
                    className={`flex h-7 items-center justify-center rounded-md font-landing-body text-xs transition ${
                      isEndpoint
                        ? 'bg-landing-primary font-bold text-landing-bg'
                        : isWithinRange
                          ? 'bg-landing-primary/25 text-landing-text'
                          : cell.isToday
                            ? 'border border-landing-primary text-landing-text'
                            : cell.disabled
                              ? 'cursor-not-allowed text-landing-text-secondary/30'
                              : 'text-landing-text hover:bg-landing-surface-card/60'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-landing-body text-xs text-landing-text-secondary">{rangeSummary}</span>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={onClearDateRange}
                  className="font-landing-body text-xs font-semibold text-landing-primary hover:underline"
                >
                  Limpiar fechas
                </button>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-landing-border" />

          <div>
            <label htmlFor="public-training-tenant" className="mb-1.5 block font-landing-body text-xs font-semibold text-landing-text-secondary">
              Organización
            </label>
            <select
              id="public-training-tenant"
              value={tenantId ?? ''}
              onChange={(event) => onChangeTenantId(event.target.value || null)}
              className="w-full rounded-lg border border-landing-border bg-landing-surface-card/60 px-3 py-2 font-landing-body text-sm text-landing-text focus:border-landing-primary focus:outline-none"
            >
              <option value="">Todas las organizaciones</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="public-training-search" className="mb-1.5 block font-landing-body text-xs font-semibold text-landing-text-secondary">
              Buscar entrenamiento
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-landing-text-secondary" aria-hidden="true">
                search
              </span>
              <input
                id="public-training-search"
                type="text"
                value={search}
                onChange={(event) => onChangeSearch(event.target.value)}
                placeholder="Buscar por nombre o tipo..."
                className="w-full rounded-lg border border-landing-border bg-landing-surface-card/60 py-2 pl-9 pr-3 font-landing-body text-sm text-landing-text placeholder:text-landing-text-secondary/60 focus:border-landing-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <footer className="border-t border-landing-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-landing-primary px-4 py-2 font-landing-body text-sm font-semibold text-landing-bg transition hover:bg-landing-primary-light"
          >
            Ver resultados
          </button>
        </footer>
      </aside>
    </div>
  );
}
