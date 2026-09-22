'use client';

import { useMemo } from 'react';
import type { MisReservasFilterState, DateRangePreset, TenantOption } from '@/hooks/portal/mis-reservas/useMisReservas';
import type { ReservasManagementAsistencia } from '@/types/portal/reservas.types';

type MisReservasFiltersPanelProps = {
  filters: MisReservasFilterState;
  onFilterChange: <K extends keyof MisReservasFilterState>(key: K, value: MisReservasFilterState[K]) => void;
  onApply: () => void;
  onClear: () => void;
  disciplines: string[];
  tenantOptions: TenantOption[];
  hasActiveFilters: boolean;
};

type ChipOption<T extends string> = {
  label: string;
  value: T;
};

const DATE_PRESETS: ChipOption<DateRangePreset & string>[] = [
  { label: 'Últimos 7 días', value: 'ultimos_7_dias' },
  { label: 'Último mes', value: 'ultimo_mes' },
  { label: 'Mes a la fecha', value: 'mes_a_la_fecha' },
  { label: 'Rango personalizado', value: 'rango_personalizado' },
];

const ASISTENCIA_CHIPS: ChipOption<ReservasManagementAsistencia | 'todos'>[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Asistió', value: 'asistio' },
  { label: 'No asistió', value: 'no_asistio' },
  { label: 'Sin registrar', value: 'sin_registrar' },
];

function validateDateRange(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return null;
  const start = new Date(desde);
  const end = new Date(hasta);
  if (end < start) return 'La fecha final debe ser posterior a la inicial.';
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 60) return 'El rango de fechas no puede superar los 60 días.';
  return null;
}

export function MisReservasFiltersPanel({
  filters,
  onFilterChange,
  onApply,
  onClear,
  disciplines,
  tenantOptions,
  hasActiveFilters,
}: MisReservasFiltersPanelProps) {
  const dateError = useMemo(() => {
    if (filters.datePreset !== 'rango_personalizado') return null;
    return validateDateRange(filters.fechaDesde, filters.fechaHasta);
  }, [filters.datePreset, filters.fechaDesde, filters.fechaHasta]);

  const canApply = !dateError;

  const handleApply = () => {
    if (canApply) onApply();
  };

  return (
    <div className="border bg-grit-glass backdrop-blur-md space-y-4 rounded-grit-2xl border-grit-glass-border p-4">
      {/* Date range */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-grit-muted">Rango de fechas:</span>
        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map((preset) => {
            const isActive = filters.datePreset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() =>
                  onFilterChange('datePreset', isActive ? null : preset.value)
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-grit-cyan/60 bg-grit-cyan/15 text-grit-cyan'
                    : 'border-grit-glass-border bg-transparent text-grit-subtext hover:border-grit-glass-border hover:text-grit-subtext'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {filters.datePreset === 'rango_personalizado' && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label htmlFor="mis-reservas-fecha-desde" className="text-xs text-grit-muted">Desde:</label>
              <input
                id="mis-reservas-fecha-desde"
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => onFilterChange('fechaDesde', e.target.value)}
                className="rounded border border-grit-glass-border bg-transparent px-2 py-1 text-xs text-grit-text focus:border-grit-cyan/60 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="mis-reservas-fecha-hasta" className="text-xs text-grit-muted">Hasta:</label>
              <input
                id="mis-reservas-fecha-hasta"
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => onFilterChange('fechaHasta', e.target.value)}
                className="rounded border border-grit-glass-border bg-transparent px-2 py-1 text-xs text-grit-text focus:border-grit-cyan/60 focus:outline-none"
              />
            </div>
            {dateError && (
              <span className="text-xs text-grit-danger">{dateError}</span>
            )}
          </div>
        )}
      </div>

      {/* Attendance chips */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-grit-muted">Asistencia:</span>
        <div className="flex flex-wrap items-center gap-2">
          {ASISTENCIA_CHIPS.map((chip) => {
            const isActive =
              chip.value === 'todos'
                ? filters.asistencia === null
                : filters.asistencia === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() =>
                  onFilterChange('asistencia', chip.value === 'todos' ? null : (chip.value as ReservasManagementAsistencia))
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-grit-cyan/60 bg-grit-cyan/15 text-grit-cyan'
                    : 'border-grit-glass-border bg-transparent text-grit-subtext hover:border-grit-glass-border hover:text-grit-subtext'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discipline dropdown */}
      <div className="space-y-1">
        <label htmlFor="mis-reservas-disciplina-filter" className="text-xs font-medium text-grit-muted">Disciplina:</label>
        <select
          id="mis-reservas-disciplina-filter"
          value={filters.disciplinaNombre}
          onChange={(e) => onFilterChange('disciplinaNombre', e.target.value)}
          className="w-full max-w-sm rounded border border-grit-glass-border bg-transparent px-3 py-1.5 text-sm text-grit-text focus:border-grit-cyan/60 focus:outline-none"
        >
          <option value="" className="bg-grit-card">Todas las disciplinas</option>
          {disciplines.map((nombre) => (
            <option key={nombre} value={nombre} className="bg-grit-card">
              {nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Organization dropdown — only shown when reservations span more than one org */}
      {tenantOptions.length > 1 && (
        <div className="space-y-1">
          <label htmlFor="mis-reservas-organizacion-filter" className="text-xs font-medium text-grit-muted">Organización:</label>
          <select
            id="mis-reservas-organizacion-filter"
            value={filters.tenantId}
            onChange={(e) => onFilterChange('tenantId', e.target.value)}
            className="w-full max-w-sm rounded border border-grit-glass-border bg-transparent px-3 py-1.5 text-sm text-grit-text focus:border-grit-cyan/60 focus:outline-none"
          >
            <option value="" className="bg-grit-card">Todas las organizaciones</option>
            {tenantOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-grit-card">
                {option.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          className="rounded-grit-md bg-grit-cyan/90 px-4 py-1.5 text-xs font-semibold text-grit-muted/60 transition-colors hover:bg-grit-cyan disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Aplicar filtros
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-grit-md border border-grit-glass-border px-4 py-1.5 text-xs font-medium text-grit-subtext transition-colors hover:border-grit-glass-border hover:text-grit-subtext"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
