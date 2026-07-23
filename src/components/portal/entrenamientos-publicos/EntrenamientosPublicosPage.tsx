'use client';

import { useState } from 'react';
import { useEntrenamientosPublicosMarketplace } from '@/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace';
import { PublicTrainingFilters } from './PublicTrainingFilters';
import { PublicTrainingsGrid } from './PublicTrainingsGrid';
import { SessionsAvailableWidget } from './SessionsAvailableWidget';
import { PublicTrainingReservaModal } from './PublicTrainingReservaModal';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

export function EntrenamientosPublicosPage() {
  const {
    loading,
    error,
    featuredItem,
    standardItems,
    tenantOptions,
    thisWeekCount,
    dateChip,
    setDateChip,
    search,
    setSearch,
    tenantId,
    setTenantId,
    refetch,
  } = useEntrenamientosPublicosMarketplace();

  const [selectedForReserva, setSelectedForReserva] = useState<PublicTrainingListItem | null>(null);

  return (
    <div className="relative min-h-[80vh] overflow-hidden rounded-3xl bg-landing-bg px-6 py-8 md:px-10 md:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-landing-primary/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-landing-primary-dark/10 blur-[120px]"
      />

      <div className="relative flex justify-end">
        <SessionsAvailableWidget count={thisWeekCount} />
      </div>

      <div className="relative mt-4 flex flex-col gap-8 lg:flex-row">
        <PublicTrainingFilters
          dateChip={dateChip}
          onChangeDateChip={setDateChip}
          search={search}
          onChangeSearch={setSearch}
          tenantId={tenantId}
          onChangeTenantId={setTenantId}
          tenantOptions={tenantOptions}
        />

        <div className="flex flex-1 flex-col gap-4">
          {loading && (
            <div className="flex flex-1 items-center justify-center py-24">
              <p className="font-landing-body text-sm text-landing-text-secondary">Cargando entrenamientos públicos...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
              <p className="font-landing-body text-sm text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-lg border border-landing-border px-3 py-2 font-landing-body text-xs font-semibold text-landing-text"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && (
            <PublicTrainingsGrid
              featuredItem={featuredItem}
              standardItems={standardItems}
              onReservar={(item) => setSelectedForReserva(item)}
            />
          )}
        </div>
      </div>

      {selectedForReserva && (
        <PublicTrainingReservaModal
          open
          tenantId={selectedForReserva.tenantId}
          entrenamientoId={selectedForReserva.entrenamientoId}
          disciplinaId={selectedForReserva.disciplinaId}
          trainingNombre={selectedForReserva.nombre}
          onClose={() => setSelectedForReserva(null)}
        />
      )}
    </div>
  );
}
