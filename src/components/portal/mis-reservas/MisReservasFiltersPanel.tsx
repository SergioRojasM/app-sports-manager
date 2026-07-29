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
    <div className="glass space-y-4 rounded-lg border border-portal-border p-4">
      {/* Date range */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500">Rango de fechas:</span>
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
                    ? 'border-turquoise/60 bg-turquoise/15 text-turquoise'
                    : 'border-portal-border bg-transparent text-slate-400 hover:border-slate-500 hover:text-slate-300'
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
              <label htmlFor="mis-reservas-fecha-desde" className="text-xs text-slate-500">Desde:</label>
              <input
                id="mis-reservas-fecha-desde"
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => onFilterChange('fechaDesde', e.target.value)}
                className="rounded border border-portal-border bg-transparent px-2 py-1 text-xs text-slate-200 focus:border-turquoise/60 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="mis-reservas-fecha-hasta" className="text-xs text-slate-500">Hasta:</label>
              <input
                id="mis-reservas-fecha-hasta"
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => onFilterChange('fechaHasta', e.target.value)}
                className="rounded border border-portal-border bg-transparent px-2 py-1 text-xs text-slate-200 focus:border-turquoise/60 focus:outline-none"
              />
            </div>
            {dateError && (
              <span className="text-xs text-rose-400">{dateError}</span>
            )}
          </div>
        )}
      </div>

      {/* Attendance chips */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-slate-500">Asistencia:</span>
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
                    ? 'border-turquoise/60 bg-turquoise/15 text-turquoise'
                    : 'border-portal-border bg-transparent text-slate-400 hover:border-slate-500 hover:text-slate-300'
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
        <label htmlFor="mis-reservas-disciplina-filter" className="text-xs font-medium text-slate-500">Disciplina:</label>
        <select
          id="mis-reservas-disciplina-filter"
          value={filters.disciplinaNombre}
          onChange={(e) => onFilterChange('disciplinaNombre', e.target.value)}
          className="w-full max-w-sm rounded border border-portal-border bg-transparent px-3 py-1.5 text-sm text-slate-200 focus:border-turquoise/60 focus:outline-none"
        >
          <option value="" className="bg-slate-800">Todas las disciplinas</option>
          {disciplines.map((nombre) => (
            <option key={nombre} value={nombre} className="bg-slate-800">
              {nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Organization dropdown — only shown when reservations span more than one org */}
      {tenantOptions.length > 1 && (
        <div className="space-y-1">
          <label htmlFor="mis-reservas-organizacion-filter" className="text-xs font-medium text-slate-500">Organización:</label>
          <select
            id="mis-reservas-organizacion-filter"
            value={filters.tenantId}
            onChange={(e) => onFilterChange('tenantId', e.target.value)}
            className="w-full max-w-sm rounded border border-portal-border bg-transparent px-3 py-1.5 text-sm text-slate-200 focus:border-turquoise/60 focus:outline-none"
          >
            <option value="" className="bg-slate-800">Todas las organizaciones</option>
            {tenantOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-800">
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
          className="rounded-lg bg-turquoise/90 px-4 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-turquoise disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Aplicar filtros
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-portal-border px-4 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
