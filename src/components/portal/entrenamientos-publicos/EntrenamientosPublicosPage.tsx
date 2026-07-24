'use client';

import { useState } from 'react';
import { useEntrenamientosPublicosMarketplace } from '@/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace';
import { PublicTrainingFiltersDrawer } from './PublicTrainingFiltersDrawer';
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="relative min-h-[80vh] rounded-3xl bg-landing-bg px-6 pb-8 pt-3 md:px-10 md:pb-10 md:pt-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-landing-primary/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-landing-primary-dark/10 blur-[120px]" />
      </div>

      <div className="sticky top-4 z-10 mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-landing-bg/40 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-landing-display text-2xl italic font-bold leading-tight text-landing-text">
            Entrenamientos <span className="text-landing-primary">Públicos</span>
          </h1>
          <SessionsAvailableWidget count={thisWeekCount} />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-landing-border bg-landing-bg/60 px-4 py-2 font-landing-body text-sm font-semibold text-landing-text transition hover:border-landing-primary/50"
        >
          <span className="material-symbols-outlined text-base text-landing-primary" aria-hidden="true">
            tune
          </span>
          Filtrar
        </button>
      </div>

      <div className="relative">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <p className="font-landing-body text-sm text-landing-text-secondary">Cargando entrenamientos públicos...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
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

      <PublicTrainingFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        dateChip={dateChip}
        onChangeDateChip={setDateChip}
        search={search}
        onChangeSearch={setSearch}
        tenantId={tenantId}
        onChangeTenantId={setTenantId}
        tenantOptions={tenantOptions}
      />

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
