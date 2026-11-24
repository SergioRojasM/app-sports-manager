'use client';

import { GritSegmented, gritPillSelectClass, type GritSegmentedOption } from '@/components/ui';
import type { TenantOption } from '@/hooks/portal/mis-suscripciones/useMisSuscripciones';
import type { PagoEstado, SuscripcionEstado } from '@/types/portal/mis-suscripciones.types';

type SuscripcionFilter = SuscripcionEstado | 'all';
type PagoFilter = PagoEstado | 'all';

type MisSuscripcionesFiltersProps = {
  suscripcionEstadoFilter: SuscripcionFilter;
  onSuscripcionEstadoChange: (value: SuscripcionFilter) => void;
  pagoEstadoFilter: PagoFilter;
  onPagoEstadoChange: (value: PagoFilter) => void;
  tenantFilter: string;
  onTenantChange: (value: string) => void;
  tenantOptions: TenantOption[];
};

const ESTADO_OPTIONS: ReadonlyArray<GritSegmentedOption<SuscripcionFilter>> = [
  { value: 'all', label: 'Todas' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'activa', label: 'Activa' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'cancelada', label: 'Cancelada' },
];

const PAGO_OPTIONS: { value: PagoFilter; label: string }[] = [
  { value: 'all', label: 'Pago: Todos' },
  { value: 'pendiente', label: 'Pago: Pendiente' },
  { value: 'validado', label: 'Pago: Validado' },
  { value: 'rechazado', label: 'Pago: Rechazado' },
];

/** Header filters of /portal/mis-suscripciones (grit-arena-v3 `y9e6Kk`): status segmented + pill selects. */
export function MisSuscripcionesFilters({
  suscripcionEstadoFilter,
  onSuscripcionEstadoChange,
  pagoEstadoFilter,
  onPagoEstadoChange,
  tenantFilter,
  onTenantChange,
  tenantOptions,
}: MisSuscripcionesFiltersProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 sm:w-auto">
      <GritSegmented
        variant="solid"
        ariaLabel="Filtrar por estado"
        options={ESTADO_OPTIONS}
        value={suscripcionEstadoFilter}
        onChange={onSuscripcionEstadoChange}
        className="max-w-full"
      />
      <select
        aria-label="Filtrar por estado del pago"
        value={pagoEstadoFilter}
        onChange={(event) => onPagoEstadoChange(event.target.value as PagoFilter)}
        className={gritPillSelectClass}
      >
        {PAGO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {tenantOptions.length > 1 ? (
        <select
          aria-label="Filtrar por organización"
          value={tenantFilter}
          onChange={(event) => onTenantChange(event.target.value)}
          className={gritPillSelectClass}
        >
          <option value="all">Todas las organizaciones</option>
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
