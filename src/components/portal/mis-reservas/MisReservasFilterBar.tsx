'use client';

import { GritSegmented, gritPillSelectClass, type GritSegmentedOption } from '@/components/ui';
import type { MisReservasFilterState, TenantOption } from '@/hooks/portal/mis-reservas/useMisReservas';
import type { ReservasManagementAsistencia } from '@/types/portal/reservas.types';
import { MisReservasCustomRange } from './MisReservasCustomRange';

type DateSegment = 'ultimos_7_dias' | 'ultimo_mes' | 'mes_a_la_fecha' | 'todo' | 'personalizado';
type AsistenciaSegment = ReservasManagementAsistencia | 'todos';

const DATE_OPTIONS: ReadonlyArray<GritSegmentedOption<DateSegment>> = [
  { value: 'ultimos_7_dias', label: '7 días' },
  { value: 'ultimo_mes', label: 'Último mes' },
  { value: 'mes_a_la_fecha', label: 'Mes a la fecha' },
  { value: 'todo', label: 'Todo' },
];

const ASISTENCIA_OPTIONS: ReadonlyArray<GritSegmentedOption<AsistenciaSegment>> = [
  { value: 'todos', label: 'Todos' },
  { value: 'asistio', label: 'Asistió' },
  { value: 'no_asistio', label: 'No asistió' },
  { value: 'sin_registrar', label: 'Sin registrar' },
];

type MisReservasFilterBarProps = {
  filters: MisReservasFilterState;
  onFilterChange: <K extends keyof MisReservasFilterState>(key: K, value: MisReservasFilterState[K]) => void;
  onApplyCustomRange: (desde: string, hasta: string) => void;
  disciplines: string[];
  tenantOptions: TenantOption[];
};

/** Filter row of /portal/mis-reservas (grit-arena-v3 `Lbdo2`): every control applies immediately. */
export function MisReservasFilterBar({ filters, onFilterChange, onApplyCustomRange, disciplines, tenantOptions }: MisReservasFilterBarProps) {
  const isCustom = filters.datePreset === 'rango_personalizado';
  // A custom range presses no date segment
  const dateValue: DateSegment = filters.datePreset === 'rango_personalizado' ? 'personalizado' : (filters.datePreset ?? 'todo');

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <GritSegmented
        variant="solid"
        ariaLabel="Filtrar por fecha"
        options={DATE_OPTIONS}
        value={dateValue}
        onChange={(value) => onFilterChange('datePreset', value === 'todo' || value === 'personalizado' ? null : value)}
        className="max-w-full"
      />
      <GritSegmented
        variant="solid"
        ariaLabel="Filtrar por asistencia"
        options={ASISTENCIA_OPTIONS}
        value={filters.asistencia ?? 'todos'}
        onChange={(value) => onFilterChange('asistencia', value === 'todos' ? null : value)}
        className="max-w-full"
      />
      <span aria-hidden="true" className="hidden flex-1 xl:block" />
      <MisReservasCustomRange
        active={isCustom && filters.fechaDesde && filters.fechaHasta ? { desde: filters.fechaDesde, hasta: filters.fechaHasta } : null}
        onApply={onApplyCustomRange}
      />
      <select
        aria-label="Filtrar por disciplina"
        value={filters.disciplinaNombre}
        onChange={(event) => onFilterChange('disciplinaNombre', event.target.value)}
        className={gritPillSelectClass}
      >
        <option value="">Todas las disciplinas</option>
        {disciplines.map((nombre) => (
          <option key={nombre} value={nombre}>
            {nombre}
          </option>
        ))}
      </select>
      {tenantOptions.length > 1 ? (
        <select
          aria-label="Filtrar por organización"
          value={filters.tenantId}
          onChange={(event) => onFilterChange('tenantId', event.target.value)}
          className={gritPillSelectClass}
        >
          <option value="">Todas las organizaciones</option>
          {tenantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.nombre}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
