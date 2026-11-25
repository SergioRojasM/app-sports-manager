'use client';

import { GritButton, GritPillSelect, cx } from '@/components/ui';
import type { SelectOption } from '@/types/portal/entrenamientos.types';
import type { EventosClientFilters } from '@/types/portal/eventos.types';

type EventosFilterBarProps = {
  filters: EventosClientFilters;
  disciplinas: SelectOption[];
  onEstadoChange: (value: EventosClientFilters['estado']) => void;
  onPeriodoChange?: (value: EventosClientFilters['periodo']) => void;
  onDisciplinaChange: (value: string) => void;
  /** Shows "Limpiar filtros" (also resets the search) when given and `hasActiveFilters`. */
  onClear?: () => void;
  hasActiveFilters?: boolean;
  /** Hides the "Borrador" estado option when the list never contains drafts (check-in selector). */
  ocultarBorrador?: boolean;
  /** Hides the Periodo select (calendar view). */
  sinPeriodo?: boolean;
  /** bar = toolbar row (35px pills) · inline = compact pills of the calendar header (`gQPV3`). */
  layout?: 'bar' | 'inline';
  className?: string;
};

/**
 * Estado / Periodo / Disciplina pill selects of the events pages (grit-arena-v3 `ZYxt2` calendar
 * header, `LV7I0` header tools). The option labels carry the filter name ("Estado: Todos") like the frames.
 */
export function EventosFilterBar({
  filters,
  disciplinas,
  onEstadoChange,
  onPeriodoChange,
  onDisciplinaChange,
  onClear,
  hasActiveFilters = false,
  ocultarBorrador = false,
  sinPeriodo = false,
  layout = 'bar',
  className,
}: EventosFilterBarProps) {
  const size = layout === 'inline' ? 'sm' : 'md';

  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <GritPillSelect
        label="Estado"
        icon="radio_button_checked"
        value={filters.estado}
        size={size}
        onChange={(value) => onEstadoChange(value as EventosClientFilters['estado'])}
      >
        <option value="todos">Estado: Todos</option>
        <option value="confirmado">Confirmado</option>
        <option value="cancelado">Cancelado</option>
        {!ocultarBorrador && <option value="borrador">Borrador</option>}
      </GritPillSelect>

      {!sinPeriodo && onPeriodoChange && (
        <GritPillSelect
          label="Periodo"
          icon="update"
          value={filters.periodo}
          size={size}
          onChange={(value) => onPeriodoChange(value as EventosClientFilters['periodo'])}
        >
          <option value="proximos">Próximos</option>
          <option value="pasados">Pasados</option>
          <option value="todos">Todos</option>
        </GritPillSelect>
      )}

      <GritPillSelect label="Disciplina" icon="military_tech" value={filters.disciplina} size={size} onChange={onDisciplinaChange}>
        <option value="todas">Disciplina: Todas</option>
        {disciplinas.map((disciplina) => (
          <option key={disciplina.id} value={disciplina.id}>
            {disciplina.label}
          </option>
        ))}
      </GritPillSelect>

      {onClear && hasActiveFilters && (
        <GritButton variant="ghost" size="sm" icon="filter_alt_off" onClick={onClear}>
          Limpiar filtros
        </GritButton>
      )}
    </div>
  );
}
