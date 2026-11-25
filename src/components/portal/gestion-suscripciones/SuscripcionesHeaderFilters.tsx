import type { PagoEstado, SuscripcionEstado } from '@/types/portal/gestion-suscripciones.types';

type SuscripcionesHeaderFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  suscripcionFilter: SuscripcionEstado | 'all';
  onSuscripcionFilterChange: (value: SuscripcionEstado | 'all') => void;
  pagoFilter: PagoEstado | 'all';
  onPagoFilterChange: (value: PagoEstado | 'all') => void;
};

type FilterChip<T extends string> = {
  label: string;
  value: T | 'all';
};

const SUSCRIPCION_CHIPS: FilterChip<SuscripcionEstado>[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Activa', value: 'activa' },
  { label: 'Vencida', value: 'vencida' },
  { label: 'Cancelada', value: 'cancelada' },
];

const PAGO_CHIPS: FilterChip<PagoEstado>[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Validado', value: 'validado' },
  { label: 'Rechazado', value: 'rechazado' },
];

function ChipRow<T extends string>({
  chips,
  active,
  onChange,
  label,
}: {
  chips: FilterChip<T>[];
  active: T | 'all';
  onChange: (v: T | 'all') => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-grit-muted">{label}:</span>
      {chips.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
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
  );
}

export function SuscripcionesHeaderFilters({
  searchTerm,
  onSearchChange,
  suscripcionFilter,
  onSuscripcionFilterChange,
  pagoFilter,
  onPagoFilterChange,
}: SuscripcionesHeaderFiltersProps) {
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
          placeholder="Buscar por atleta, plan o ID de suscripción…"
          className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg py-2.5 pl-10 pr-4 text-sm text-grit-text placeholder-grit-muted outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30"
        />
      </div>

      {/* Filter chip rows */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <ChipRow
          label="Suscripción"
          chips={SUSCRIPCION_CHIPS}
          active={suscripcionFilter}
          onChange={onSuscripcionFilterChange}
        />
        <ChipRow
          label="Pago"
          chips={PAGO_CHIPS}
          active={pagoFilter}
          onChange={onPagoFilterChange}
        />
      </div>
    </div>
  );
}
