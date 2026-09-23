'use client';

import Link from 'next/link';
import type { MiSuscripcionRow } from '@/types/portal/mis-suscripciones.types';
import { useMisSuscripciones } from '@/hooks/portal/mis-suscripciones/useMisSuscripciones';
import { MisSuscripcionesFilters } from './MisSuscripcionesFilters';
import { SuscripcionCard } from './SuscripcionCard';

type MisSuscripcionesYPagosPageProps = {
  suscripciones: MiSuscripcionRow[];
  userId: string;
};

export function MisSuscripcionesYPagosPage({
  suscripciones,
  userId,
}: MisSuscripcionesYPagosPageProps) {
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
  const isFilterEmpty = !isEmpty && filteredSuscripciones.length === 0;

  // True empty state: no subscriptions at all
  if (isEmpty) {
    return (
      <div className="space-y-6">
        <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]">Mis Suscripciones</h1>
        <div className="border border-grit-glass-border bg-grit-card backdrop-blur-md rounded-grit-2xl p-8 text-center">
          <span className="material-symbols-outlined mb-2 text-4xl text-grit-muted">
            credit_card_off
          </span>
          <p className="text-grit-subtext">
            Aún no tienes suscripciones en ninguna organización.
          </p>
          <Link
            href="/portal/orgs"
            className="mt-3 inline-block text-sm font-medium text-grit-teal hover:underline"
          >
            Explorar organizaciones y sus planes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]">Mis Suscripciones</h1>

      {/* Filters */}
      <MisSuscripcionesFilters
        suscripcionEstadoFilter={suscripcionEstadoFilter}
        onSuscripcionEstadoChange={setSuscripcionEstadoFilter}
        pagoEstadoFilter={pagoEstadoFilter}
        onPagoEstadoChange={setPagoEstadoFilter}
        tenantFilter={tenantFilter}
        onTenantChange={setTenantFilter}
        tenantOptions={tenantOptions}
      />

      {/* Filter empty state */}
      {isFilterEmpty ? (
        <div className="border border-grit-glass-border bg-grit-card backdrop-blur-md rounded-grit-2xl p-8 text-center">
          <p className="text-grit-subtext">No se encontraron resultados con los filtros seleccionados.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-grit-teal hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSuscripciones.map((s) => (
            <SuscripcionCard
              key={s.id}
              suscripcion={s}
              tenantId={s.tenant_id}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
