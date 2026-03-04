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
      <span className="text-xs font-medium text-slate-500">{label}:</span>
      {chips.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
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
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
          search
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por atleta, plan o ID de suscripción…"
          className="w-full rounded-lg border border-portal-border bg-navy-deep py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30"
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
