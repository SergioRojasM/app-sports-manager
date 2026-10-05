'use client';

import { useState } from 'react';
import { useEventosPublicos } from '@/hooks/portal/eventos/useEventosPublicos';
import { useObtenerEntrada } from '@/hooks/portal/eventos/useObtenerEntrada';
import { EVENTOS_DEFAULT_WINDOW_DAYS, buildEventoPortalDetalleHref } from '@/lib/portal/eventos-publicos.utils';
import { EventoEntradasModal } from './EventoEntradasModal';
import { EventosDisponiblesWidget } from './EventosDisponiblesWidget';
import { EventosPublicosFiltersDrawer } from './EventosPublicosFiltersDrawer';
import { EventosPublicosGrid } from './EventosPublicosGrid';

const LISTADO_PATH = '/portal/eventos';

/** Portal event discovery (US-0120), modeled on the public-trainings marketplace. */
export function EventosPublicosPage() {
  const eventos = useEventosPublicos();
  const obtenerEntrada = useObtenerEntrada({ surface: 'portal' });
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="relative min-h-[80vh]">
      <div className="sticky top-4 z-10 mb-8 flex flex-wrap items-center justify-between gap-4 rounded-grit-2xl bg-grit-bg/40 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-grit-title text-3xl font-bold italic leading-tight text-grit-text sm:text-[36px]">
            Eventos <span className="text-grit-cyan">Públicos</span>
          </h1>
          <EventosDisponiblesWidget count={eventos.items.length} />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-2 rounded-grit-md border border-grit-glass-border bg-grit-bg/60 px-4 py-2 font-grit-body text-sm font-semibold text-grit-text transition hover:border-grit-cyan/50"
        >
          <span className="material-symbols-outlined text-base text-grit-cyan" aria-hidden="true">
            tune
          </span>
          Filtrar
        </button>
      </div>

      {eventos.isDefaultDateRange && !eventos.loading && !eventos.error && (
        <p className="-mt-4 mb-6 font-grit-body text-xs text-grit-subtext">
          Se muestran los eventos de los próximos {EVENTOS_DEFAULT_WINDOW_DAYS} días. Si quieres ver más, filtra por fechas.
        </p>
      )}

      <div className="relative">
        {eventos.loading && (
          <div className="flex items-center justify-center py-24">
            <p className="font-grit-body text-sm text-grit-subtext">Cargando eventos…</p>
          </div>
        )}

        {!eventos.loading && eventos.error && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <p className="font-grit-body text-sm text-grit-danger">{eventos.error}</p>
            <button
              type="button"
              onClick={() => void eventos.refetch()}
              className="rounded-grit-md border border-grit-glass-border px-3 py-2 font-grit-body text-xs font-semibold text-grit-text"
            >
              Reintentar
            </button>
          </div>
        )}

        {!eventos.loading && !eventos.error && (
          <EventosPublicosGrid
            featuredItem={eventos.featuredItem}
            standardItems={eventos.standardItems}
            buildDetalleHref={(evento) => buildEventoPortalDetalleHref(evento.id, { from: LISTADO_PATH })}
            onObtenerEntrada={obtenerEntrada.obtenerEntrada}
            obtenerEntradaDisabled={obtenerEntrada.disabled}
            hasActiveFilters={eventos.hasActiveFilters}
            onClearFilters={eventos.clearFilters}
          />
        )}
      </div>

      <EventosPublicosFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        dateFrom={eventos.dateFrom}
        dateTo={eventos.dateTo}
        calendarMonth={eventos.calendarMonth}
        onGoToPrevMonth={eventos.goToPrevMonth}
        onGoToNextMonth={eventos.goToNextMonth}
        onSetDateRange={eventos.setDateRange}
        onClearDateRange={eventos.clearDateRange}
        onApplyDateChip={eventos.applyDateChip}
        search={eventos.search}
        onChangeSearch={eventos.setSearch}
        tenantId={eventos.tenantId}
        onChangeTenantId={eventos.setTenantId}
        tenantOptions={eventos.tenantOptions}
        disciplina={eventos.disciplina}
        onChangeDisciplina={eventos.setDisciplina}
        disciplinaOptions={eventos.disciplinaOptions}
        onClearFilters={eventos.clearFilters}
      />

      <EventoEntradasModal
        open={obtenerEntrada.entradasModal.open}
        evento={obtenerEntrada.target}
        modo={obtenerEntrada.entradasModal.modo}
        onClose={obtenerEntrada.entradasModal.close}
      />
    </div>
  );
}
