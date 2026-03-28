'use client';

import type { SuscripcionEstado, PagoEstado } from '@/types/portal/mis-suscripciones-y-pagos.types';

type SuscripcionFilter = SuscripcionEstado | 'all';
type PagoFilter = PagoEstado | 'all';

type MisSuscripcionesFiltersProps = {
  suscripcionEstadoFilter: SuscripcionFilter;
  onSuscripcionEstadoChange: (v: SuscripcionFilter) => void;
  pagoEstadoFilter: PagoFilter;
  onPagoEstadoChange: (v: PagoFilter) => void;
};

type Chip<T> = { label: string; value: T };

const SUSCRIPCION_CHIPS: Chip<SuscripcionFilter>[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Activa', value: 'activa' },
  { label: 'Vencida', value: 'vencida' },
  { label: 'Cancelada', value: 'cancelada' },
];

const PAGO_CHIPS: Chip<PagoFilter>[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Validado', value: 'validado' },
  { label: 'Rechazado', value: 'rechazado' },
];

function ChipGroup<T extends string>({
  label,
  chips,
  active,
  onChange,
}: {
  label: string;
  chips: Chip<T>[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isActive = active === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onChange(chip.value)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                isActive
                  ? 'bg-turquoise/20 text-turquoise border border-turquoise/50'
                  : 'bg-slate-800/40 text-slate-400 border border-transparent hover:text-slate-200'
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

export function MisSuscripcionesFilters({
  suscripcionEstadoFilter,
  onSuscripcionEstadoChange,
  pagoEstadoFilter,
  onPagoEstadoChange,
}: MisSuscripcionesFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
      <ChipGroup
        label="Estado suscripción"
        chips={SUSCRIPCION_CHIPS}
        active={suscripcionEstadoFilter}
        onChange={onSuscripcionEstadoChange}
      />
      <ChipGroup
        label="Estado pago"
        chips={PAGO_CHIPS}
        active={pagoEstadoFilter}
        onChange={onPagoEstadoChange}
      />
    </div>
  );
}
