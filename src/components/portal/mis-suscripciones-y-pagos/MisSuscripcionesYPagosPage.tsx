'use client';

import type { MiSuscripcionRow } from '@/types/portal/mis-suscripciones-y-pagos.types';
import { useMisSuscripciones } from '@/hooks/portal/mis-suscripciones-y-pagos/useMisSuscripciones';
import { MisSuscripcionesFilters } from './MisSuscripcionesFilters';
import { SuscripcionCard } from './SuscripcionCard';

type MisSuscripcionesYPagosPageProps = {
  suscripciones: MiSuscripcionRow[];
  tenantId: string;
  userId: string;
};

export function MisSuscripcionesYPagosPage({
  suscripciones,
  tenantId,
  userId,
}: MisSuscripcionesYPagosPageProps) {
  const {
    suscripcionEstadoFilter,
    setSuscripcionEstadoFilter,
    pagoEstadoFilter,
    setPagoEstadoFilter,
    filteredSuscripciones,
    clearFilters,
  } = useMisSuscripciones(suscripciones);

  const isEmpty = suscripciones.length === 0;
  const isFilterEmpty = !isEmpty && filteredSuscripciones.length === 0;

  // True empty state: no subscriptions at all
  if (isEmpty) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-100">Mis Suscripciones</h1>
        <div className="glass-card rounded-md p-8 text-center">
          <span className="material-symbols-outlined mb-2 text-4xl text-slate-500">
            credit_card_off
          </span>
          <p className="text-slate-400">
            Aún no tienes suscripciones en esta organización.
          </p>
          <a
            href={`/portal/orgs/${tenantId}/gestion-planes`}
            className="mt-3 inline-block text-sm font-medium text-secondary hover:underline"
          >
            Ver planes disponibles
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-100">Mis Suscripciones</h1>

      {/* Filters */}
      <MisSuscripcionesFilters
        suscripcionEstadoFilter={suscripcionEstadoFilter}
        onSuscripcionEstadoChange={setSuscripcionEstadoFilter}
        pagoEstadoFilter={pagoEstadoFilter}
        onPagoEstadoChange={setPagoEstadoFilter}
      />

      {/* Filter empty state */}
      {isFilterEmpty ? (
        <div className="glass-card rounded-md p-8 text-center">
          <p className="text-slate-400">No se encontraron resultados con los filtros seleccionados.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-secondary hover:underline"
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
              tenantId={tenantId}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
