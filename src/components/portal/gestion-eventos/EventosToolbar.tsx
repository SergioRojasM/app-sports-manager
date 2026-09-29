'use client';

import { useRef } from 'react';
import { GritIcon, cx, gritFocusRing, gritInputClass, gritSelectClass } from '@/components/ui';
import type { SelectOption } from '@/types/portal/entrenamientos.types';
import type { EventosClientFilters, EventosVista } from '@/types/portal/eventos.types';

type EventosToolbarProps = {
  vista: EventosVista;
  onVistaChange: (vista: EventosVista) => void;
  filters: EventosClientFilters;
  disciplinas: SelectOption[];
  onSearchChange: (value: string) => void;
  onEstadoChange: (value: EventosClientFilters['estado']) => void;
  onPeriodoChange: (value: EventosClientFilters['periodo']) => void;
  onDisciplinaChange: (value: string) => void;
};

const VISTA_OPTIONS: Array<{ value: EventosVista; label: string; icon: string }> = [
  { value: 'tarjetas', label: 'Tarjetas', icon: 'grid_view' },
  { value: 'lista', label: 'Lista', icon: 'view_list' },
  { value: 'calendario', label: 'Calendario', icon: 'calendar_month' },
];

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-[150px] flex-1 flex-col gap-1 sm:flex-none">
      <span className="font-grit-body text-[11px] font-semibold uppercase tracking-wide text-grit-muted">{label}</span>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className={gritSelectClass}>
          {children}
        </select>
        <GritIcon
          name="expand_more"
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-grit-muted"
        />
      </div>
    </label>
  );
}

export function EventosToolbar({
  vista,
  onVistaChange,
  filters,
  disciplinas,
  onSearchChange,
  onEstadoChange,
  onPeriodoChange,
  onDisciplinaChange,
}: EventosToolbarProps) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleVistaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = VISTA_OPTIONS.findIndex((option) => option.value === vista);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % VISTA_OPTIONS.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      nextIndex = (currentIndex - 1 + VISTA_OPTIONS.length) % VISTA_OPTIONS.length;

    if (nextIndex === null) return;
    event.preventDefault();
    onVistaChange(VISTA_OPTIONS[nextIndex].value);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex flex-col gap-4 rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Vista de eventos"
          onKeyDown={handleVistaKeyDown}
          className="inline-flex gap-1 rounded-grit-md border border-grit-glass-border bg-grit-bg/60 p-1"
        >
          {VISTA_OPTIONS.map((option, index) => {
            const selected = option.value === vista;
            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onVistaChange(option.value)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-grit-sm px-3 py-1.5 font-grit-body text-sm font-semibold transition',
                  gritFocusRing,
                  selected ? 'bg-grit-card text-grit-cyan' : 'text-grit-subtext hover:text-grit-text',
                )}
              >
                <GritIcon name={option.icon} size={16} />
                {option.label}
              </button>
            );
          })}
        </div>

        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar evento por nombre</span>
          <GritIcon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grit-muted"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar evento…"
            className={cx(gritInputClass, 'pl-10')}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <SelectField
          label="Estado"
          value={filters.estado}
          onChange={(value) => onEstadoChange(value as EventosClientFilters['estado'])}
        >
          <option value="todos">Todos</option>
          <option value="confirmado">Confirmado</option>
          <option value="cancelado">Cancelado</option>
        </SelectField>

        {vista !== 'calendario' && (
          <SelectField
            label="Periodo"
            value={filters.periodo}
            onChange={(value) => onPeriodoChange(value as EventosClientFilters['periodo'])}
          >
            <option value="proximos">Próximos</option>
            <option value="pasados">Pasados</option>
            <option value="todos">Todos</option>
          </SelectField>
        )}

        <SelectField label="Disciplina" value={filters.disciplinaId} onChange={onDisciplinaChange}>
          <option value="todas">Todas</option>
          {disciplinas.map((disciplina) => (
            <option key={disciplina.id} value={disciplina.id}>
              {disciplina.label}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}
