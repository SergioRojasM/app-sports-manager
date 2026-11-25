'use client';

import { GritButton, GritEmptyState, GritPageHeader } from '@/components/ui';
import { useMisSuscripciones } from '@/hooks/portal/mis-suscripciones/useMisSuscripciones';
import type { MiSuscripcionRow } from '@/types/portal/mis-suscripciones.types';
import { MisSuscripcionesFilters } from './MisSuscripcionesFilters';
import { SuscripcionCard } from './SuscripcionCard';

type MisSuscripcionesYPagosPageProps = {
  suscripciones: MiSuscripcionRow[];
  userId: string;
};

/** Cross-tenant "Mis suscripciones" (grit-arena-v3 frame `LSqV5`). */
export function MisSuscripcionesYPagosPage({ suscripciones, userId }: MisSuscripcionesYPagosPageProps) {
  const {
    suscripcionEstadoFilter,
    setSuscripcionEstadoFilter,
    pagoEstadoFilter,
    setPagoEstadoFilter,
    tenantFilter,
    setTenantFilter,
    tenantOptions,
    filteredSuscripciones,
    clearFilters,
  } = useMisSuscripciones(suscripciones);

  const isEmpty = suscripciones.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <GritPageHeader
        title="Mis"
        titleAccent="suscripciones."
        italic
        actions={
          isEmpty ? undefined : (
            <MisSuscripcionesFilters
              suscripcionEstadoFilter={suscripcionEstadoFilter}
              onSuscripcionEstadoChange={setSuscripcionEstadoFilter}
              pagoEstadoFilter={pagoEstadoFilter}
              onPagoEstadoChange={setPagoEstadoFilter}
              tenantFilter={tenantFilter}
              onTenantChange={setTenantFilter}
              tenantOptions={tenantOptions}
            />
          )
        }
      />

      {isEmpty ? (
        <GritEmptyState
          icon="credit_card_off"
          title="Aún no tienes suscripciones"
          description="Cuando te suscribas a un plan de una organización, lo verás aquí."
          action={
            <GritButton href="/portal/orgs" icon="explore">
              Explorar organizaciones
            </GritButton>
          }
        />
      ) : filteredSuscripciones.length === 0 ? (
        <GritEmptyState
          icon="filter_alt_off"
          title="No hay suscripciones con estos filtros"
          action={
            <GritButton variant="secondary" size="sm" icon="restart_alt" onClick={clearFilters}>
              Limpiar filtros
            </GritButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredSuscripciones.map((suscripcion) => (
            <SuscripcionCard key={suscripcion.id} suscripcion={suscripcion} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
