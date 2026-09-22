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
  { label: 'Pendiente de activación', value: 'pendiente_activacion' },
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
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-grit-subtext">
          search
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg py-2.5 pl-10 pr-4 text-sm text-grit-text placeholder-grit-muted outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30"
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
  );
}
