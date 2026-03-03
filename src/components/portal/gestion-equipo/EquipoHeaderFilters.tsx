import type { MiembroEstado } from '@/types/portal/equipo.types';

type EquipoHeaderFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  estadoFilter: MiembroEstado | 'all';
  onEstadoFilterChange: (value: MiembroEstado | 'all') => void;
};

type FilterChip = {
  label: string;
  value: MiembroEstado | 'all';
};

const CHIPS: FilterChip[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Activo', value: 'activo' },
  { label: 'Mora', value: 'mora' },
  { label: 'Suspendido', value: 'suspendido' },
  { label: 'Inactivo', value: 'inactivo' },
];

export function EquipoHeaderFilters({
  searchTerm,
  onSearchChange,
  estadoFilter,
  onEstadoFilterChange,
}: EquipoHeaderFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
          search
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          className="w-full rounded-lg border border-portal-border bg-navy-deep py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30"
        />
      </div>

      {/* Estado filter chips */}
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => {
          const isActive = estadoFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onEstadoFilterChange(chip.value)}
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
  );
}
