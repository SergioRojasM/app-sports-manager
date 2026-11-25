'use client';

import { useState } from 'react';
import {
  GritButton,
  GritChip,
  GritEmptyState,
  GritIconButton,
  GritPageHeader,
  GritSearchField,
  GritSectionHeading,
} from '@/components/ui';
import { useEventosPublicos } from '@/hooks/portal/eventos/useEventosPublicos';
import { useObtenerEntrada } from '@/hooks/portal/eventos/useObtenerEntrada';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { EVENTOS_DEFAULT_WINDOW_DAYS, buildEventoPortalDetalleHref } from '@/lib/portal/eventos-publicos.utils';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';
import { EventoEntradasModal } from './EventoEntradasModal';
import { EventosPortalFeatured } from './EventosPortalFeatured';
import { EventosPortalGrid } from './EventosPortalGrid';
import { EventosPublicosFiltersDrawer } from './EventosPublicosFiltersDrawer';

const LISTADO_PATH = '/portal/eventos';

const buildDetalleHref = (evento: EventoPublicoListItem) => buildEventoPortalDetalleHref(evento.id, { from: LISTADO_PATH });

/** Portal event discovery (US-0120), grit-arena-v3 frame `zY4v8`. */
export function EventosPublicosPage() {
  const eventos = useEventosPublicos();
  const obtenerEntrada = useObtenerEntrada({ surface: 'portal' });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const items = eventos.items;
  const hero = items[0] ?? null;
  const compact = items.slice(1, 3);
  const rest = items.slice(3);
  const hasData = !eventos.loading && !eventos.error;

  return (
    <div className="flex flex-col gap-5">
      <GritPageHeader
        title="Tu próximo"
        titleAccent="reto."
        actions={
          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <GritSearchField
              size="lg"
              aria-label="Buscar evento o ciudad"
              placeholder="Buscar evento o ciudad"
              value={eventos.search}
              onChange={(event) => eventos.setSearch(event.target.value)}
              className="min-w-0 flex-1 sm:w-[320px] sm:flex-none"
            />
            <span className="relative">
              <GritIconButton icon="tune" label="Filtros" size="lg" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" />
              {eventos.hasDrawerFilters ? (
                <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-grit-bg bg-grit-cyan" />
              ) : null}
              {eventos.hasDrawerFilters ? <span className="sr-only">(filtros activos)</span> : null}
            </span>
          </div>
        }
      />

      {eventos.disciplinaOptions.length > 0 ? (
        <div role="group" aria-label="Disciplinas" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <GritChip active={eventos.disciplina === null} icon="grid_view" onClick={() => eventos.setDisciplina(null)}>
            Todos
          </GritChip>
          {eventos.disciplinaOptions.map((nombre) => (
            <GritChip
              key={nombre}
              active={eventos.disciplina === nombre}
              icon={getDisciplinaVisual(nombre).icon}
              onClick={() => eventos.setDisciplina(nombre)}
            >
              {nombre}
            </GritChip>
          ))}
        </div>
      ) : null}

      {eventos.loading ? <GritEmptyState icon="hourglass_top" title="Cargando eventos…" /> : null}

      {!eventos.loading && eventos.error ? (
        <GritEmptyState
          icon="error"
          title="No fue posible cargar los eventos."
          action={
            <GritButton variant="secondary" size="sm" icon="refresh" onClick={() => void eventos.refetch()}>
              Reintentar
            </GritButton>
          }
        />
      ) : null}

      {hasData && !hero ? (
        eventos.hasActiveFilters ? (
          <GritEmptyState
            icon="filter_alt_off"
            title="No hay eventos que coincidan con los filtros"
            action={
              <GritButton variant="secondary" size="sm" icon="restart_alt" onClick={eventos.clearFilters}>
                Limpiar filtros
              </GritButton>
            }
          />
        ) : (
          <GritEmptyState icon="celebration" title="No hay eventos disponibles por ahora." />
        )
      ) : null}

      {hasData && hero ? (
        <EventosPortalFeatured
          hero={hero}
          compact={compact}
          buildDetalleHref={buildDetalleHref}
          onObtenerEntrada={obtenerEntrada.obtenerEntrada}
          obtenerEntradaDisabled={obtenerEntrada.disabled}
        />
      ) : null}

      {hasData && rest.length > 0 ? (
        <section aria-labelledby="eventos-proximos-titulo" className="flex flex-col gap-4">
          <GritSectionHeading
            title={
              <span id="eventos-proximos-titulo">
                {eventos.isDefaultDateRange ? `Próximos ${EVENTOS_DEFAULT_WINDOW_DAYS} días` : 'Más eventos'}
              </span>
            }
            size="md"
            className="[&_h2]:font-grit-body [&_h2]:text-base [&_h2]:font-medium"
            action={
              <GritButton variant="secondary" size="sm" icon="calendar_month" onClick={() => setFiltersOpen(true)}>
                Ver calendario
              </GritButton>
            }
          />
          <EventosPortalGrid eventos={rest} buildDetalleHref={buildDetalleHref} />
        </section>
      ) : null}

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
        tenantId={eventos.tenantId}
        onChangeTenantId={eventos.setTenantId}
        tenantOptions={eventos.tenantOptions}
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
