import { GritIcon, GritPillSelect, GritSegmented } from '@/components/ui';
import { MAX_TIPOS_SEGMENTED, type ScenarioTipoOption } from '@/lib/portal/admin-catalogo.utils';

type ScenariosHeaderFiltersProps = {
  total: number;
  tipoOptions: ScenarioTipoOption[];
  tipoFilter: string;
  onTipoChange: (value: string) => void;
  summary: { cupos: number; horariosActivos: number };
};

/**
 * Filter row of the scenarios page (`qG0T5` `gsHK1`): type filter with counts (segmented up to
 * 5 types, a pill select above) and the "cupos totales" / "horarios activos" summary.
 */
export function ScenariosHeaderFilters({ total, tipoOptions, tipoFilter, onTipoChange, summary }: ScenariosHeaderFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      {tipoOptions.length > MAX_TIPOS_SEGMENTED ? (
        <GritPillSelect label="Tipo de escenario" icon="filter_list" value={tipoFilter} onChange={onTipoChange}>
          <option value="todos">Tipo: Todos ({total})</option>
          {tipoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </GritPillSelect>
      ) : (
        <GritSegmented
          ariaLabel="Tipo de escenario"
          value={tipoFilter}
          onChange={onTipoChange}
          options={[
            { value: 'todos', label: 'Todos', count: total },
            ...tipoOptions.map((option) => ({ value: option.value, label: option.label, count: option.count })),
          ]}
        />
      )}
      <p className="flex flex-wrap items-center gap-x-[18px] gap-y-1 font-grit-body text-xs text-grit-subtext">
        <span className="inline-flex items-center gap-2">
          <GritIcon name="group" size={14} className="text-grit-cyan" />
          {summary.cupos} cupos totales
        </span>
        <span className="inline-flex items-center gap-2">
          <GritIcon name="alarm" size={14} className="text-grit-cyan" />
          {summary.horariosActivos} horarios activos
        </span>
      </p>
    </div>
  );
}
