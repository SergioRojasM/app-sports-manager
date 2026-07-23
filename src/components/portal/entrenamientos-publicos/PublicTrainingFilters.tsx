'use client';

import type { PublicTrainingDateChip } from '@/types/portal/entrenamientos-publicos.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';

const DATE_CHIPS: { value: PublicTrainingDateChip; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'weekend', label: 'Fin de semana' },
];

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function buildCalendarDays(reference: Date): { day: number; isCurrentMonth: boolean; isToday: boolean }[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // Monday-based offset
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const cells: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

  for (let i = startOffset; i > 0; i -= 1) {
    cells.push({ day: daysInPrevMonth - i + 1, isCurrentMonth: false, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      isCurrentMonth: true,
      isToday: day === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, isCurrentMonth: false, isToday: false });
    nextDay += 1;
  }

  return cells;
}

type PublicTrainingFiltersProps = {
  dateChip: PublicTrainingDateChip | null;
  onChangeDateChip: (chip: PublicTrainingDateChip | null) => void;
  search: string;
  onChangeSearch: (value: string) => void;
  tenantId: string | null;
  onChangeTenantId: (tenantId: string | null) => void;
  tenantOptions: SelectOption[];
};

export function PublicTrainingFilters({
  dateChip,
  onChangeDateChip,
  search,
  onChangeSearch,
  tenantId,
  onChangeTenantId,
  tenantOptions,
}: PublicTrainingFiltersProps) {
  const today = new Date();
  const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(today);
  const calendarDays = buildCalendarDays(today);

  return (
    <div className="flex w-full flex-col gap-8 lg:w-[380px] lg:shrink-0">
      <div>
        <p className="mb-2 font-landing-body text-xs font-semibold uppercase tracking-[0.2em] text-landing-primary">
          Entrenamientos ·
        </p>
        <h1 className="font-landing-display text-4xl italic font-bold leading-tight text-landing-text">
          Entrenamientos
          <br />
          <span className="text-landing-primary">Públicos</span>
        </h1>
        <p className="mt-3 font-landing-body text-sm text-landing-text-secondary">
          Descubre y reserva entrenamientos abiertos para todos los atletas.
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-landing-border bg-landing-surface-card/70 p-5 backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          {DATE_CHIPS.map((chip) => {
            const selected = dateChip === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => onChangeDateChip(selected ? null : chip.value)}
                className={`rounded-lg border px-3 py-2 font-landing-body text-xs font-semibold transition ${
                  selected
                    ? 'border-landing-primary bg-landing-primary text-landing-bg'
                    : 'border-landing-border bg-landing-bg/60 text-landing-text-secondary hover:border-landing-primary/50'
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
            <span className="font-landing-body text-sm font-semibold capitalize text-landing-text">{monthLabel}</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="font-landing-body text-[11px] font-semibold text-landing-text-secondary">
                {label}
              </span>
            ))}
            {calendarDays.map((cell, index) => (
              <span
                key={index}
                className={`flex h-7 items-center justify-center rounded-md font-landing-body text-xs ${
                  cell.isToday
                    ? 'bg-landing-primary font-bold text-landing-bg'
                    : cell.isCurrentMonth
                      ? 'text-landing-text'
                      : 'text-landing-text-secondary/30'
                }`}
              >
                {cell.day}
              </span>
            ))}
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
            className="w-full rounded-lg border border-landing-border bg-landing-bg/60 px-3 py-2 font-landing-body text-sm text-landing-text focus:border-landing-primary focus:outline-none"
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
              className="w-full rounded-lg border border-landing-border bg-landing-bg/60 py-2 pl-9 pr-3 font-landing-body text-sm text-landing-text placeholder:text-landing-text-secondary/60 focus:border-landing-primary focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
