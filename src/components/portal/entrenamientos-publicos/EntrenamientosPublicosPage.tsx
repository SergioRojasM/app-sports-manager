'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEntrenamientosPublicosMarketplace } from '@/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace';
import { parseGuidedParams } from '@/lib/portal/entrenamientos-publicos/guidedBooking';
import { PublicTrainingFiltersDrawer } from './PublicTrainingFiltersDrawer';
import { PublicTrainingsGrid } from './PublicTrainingsGrid';
import { SessionsAvailableWidget } from './SessionsAvailableWidget';
import { PublicTrainingReservaModal } from './PublicTrainingReservaModal';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

export function EntrenamientosPublicosPage() {
  const {
    loading,
    error,
    items,
    allItems,
    featuredItem,
    standardItems,
    tenantOptions,
    dateFrom,
    dateTo,
    calendarMonth,
    goToPrevMonth,
    goToNextMonth,
    setDateRange,
    clearDateRange,
    applyDateChip,
    search,
    setSearch,
    tenantId,
    setTenantId,
    refetch,
  } = useEntrenamientosPublicosMarketplace();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedForReserva, setSelectedForReserva] = useState<PublicTrainingListItem | null>(null);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const guidedAttempted = useRef(false);

  // Auto-open the booking modal for a training selected on the public landing page,
  // carried here via the guided `next` query params — only attempted once, after the
  // marketplace list has finished its initial load. Looks up `allItems` (unfiltered)
  // rather than the currently filtered `items`, since the guided target may fall outside
  // the marketplace's default date/tenant/search filters even though it's still published.
  useEffect(() => {
    if (guidedAttempted.current || loading) return;
    guidedAttempted.current = true;

    const target = parseGuidedParams(searchParams);
    if (!target) return;

    const match = allItems.find((item) => item.entrenamientoId === target.entrenamientoId);
    if (match) {
      setSelectedForReserva(match);
      setGuidedOpen(true);
    }

    router.replace(pathname, { scroll: false });
  }, [loading, allItems, searchParams, router, pathname]);

  return (
    <div className="relative min-h-[80vh] px-6 pb-8 pt-3 md:px-10 md:pb-10 md:pt-4">
      <div className="sticky top-4 z-10 mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-landing-bg/40 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-landing-display text-2xl italic font-bold leading-tight text-landing-text">
            Entrenamientos <span className="text-landing-primary">Públicos</span>
          </h1>
          <SessionsAvailableWidget count={items.length} />
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
        dateFrom={dateFrom}
        dateTo={dateTo}
        calendarMonth={calendarMonth}
        onGoToPrevMonth={goToPrevMonth}
        onGoToNextMonth={goToNextMonth}
        onSetDateRange={setDateRange}
        onClearDateRange={clearDateRange}
        onApplyDateChip={applyDateChip}
        search={search}
        onChangeSearch={setSearch}
        tenantId={tenantId}
        onChangeTenantId={setTenantId}
        tenantOptions={tenantOptions}
      />

      {selectedForReserva && (
        <PublicTrainingReservaModal
          open
          guided={guidedOpen}
          tenantId={selectedForReserva.tenantId}
          entrenamientoId={selectedForReserva.entrenamientoId}
          disciplinaId={selectedForReserva.disciplinaId}
          trainingNombre={selectedForReserva.nombre}
          tenantNombre={selectedForReserva.tenantNombre}
          omitirConfirmacionPlan={selectedForReserva.omitirConfirmacionPlan}
          onClose={() => {
            setSelectedForReserva(null);
            setGuidedOpen(false);
          }}
        />
      )}
    </div>
  );
}
