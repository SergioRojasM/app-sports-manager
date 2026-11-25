'use client';

import { useMemo } from 'react';
import { GritButton, GritEmptyState, GritPageHeader, GritPagination, GritSearchField } from '@/components/ui';
import { EventosFilterBar } from '@/components/portal/gestion-eventos/EventosFilterBar';
import { useGestionEventos } from '@/hooks/portal/gestion-eventos/useGestionEventos';
import { useResumenesIngreso } from '@/hooks/portal/control-ingreso/useResumenesIngreso';
import { CheckinEventoCard } from './CheckinEventoCard';
import { CheckinPasos } from './CheckinPasos';

type ControlIngresoEventosPageProps = {
  tenantId: string;
};

const PAGE_SIZE = 10;

/**
 * "Control de ingreso." (US-0131, grit-arena-v3 `LV7I0`): the tenant's published events as check-in
 * cards, filtered like "Eventos" (search, estado, periodo, disciplina). "Próximos" counts from today
 * 00:00 Bogotá so an event in progress stays listed.
 */
export function ControlIngresoEventosPage({ tenantId }: ControlIngresoEventosPageProps) {
  const gestion = useGestionEventos(tenantId, { excluirBorradores: true, proximosDesdeHoy: true, pageSize: PAGE_SIZE });
  const pageIds = useMemo(() => gestion.paginatedEventos.map((evento) => evento.id), [gestion.paginatedEventos]);
  const resumenes = useResumenesIngreso(pageIds);

  const renderContent = () => {
    if (gestion.error) {
      return (
        <GritEmptyState
          icon="error"
          title="No se pudieron cargar los eventos"
          description={gestion.error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" size="sm" icon="refresh" onClick={() => void gestion.reload()}>
              Reintentar
            </GritButton>
          }
        />
      );
    }

    if (gestion.loading) {
      return (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-[240px] animate-pulse rounded-grit-2xl bg-white/[0.04]" />
          ))}
        </div>
      );
    }

    if (gestion.eventos.length === 0) {
      return <GritEmptyState icon="event_busy" title="No hay eventos para controlar ingreso." />;
    }

    if (gestion.filteredEventos.length === 0) {
      return (
        <GritEmptyState
          icon="search_off"
          title="No hay eventos que coincidan con los filtros"
          action={
            <GritButton variant="secondary" size="sm" onClick={gestion.clearFilters}>
              Limpiar filtros
            </GritButton>
          }
        />
      );
    }

    return (
      <>
        <div className="flex flex-col gap-4">
          {gestion.paginatedEventos.map((evento) => (
            <CheckinEventoCard key={evento.id} tenantId={tenantId} evento={evento} resumen={resumenes[evento.id]} />
          ))}
        </div>
        <GritPagination
          page={gestion.currentPage}
          totalPages={gestion.totalPages}
          onPageChange={gestion.setCurrentPage}
        />
      </>
    );
  };

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Control de"
        titleAccent="ingreso."
        italic
        actions={
          <>
            <GritSearchField
              size="lg"
              aria-label="Buscar evento"
              placeholder="Buscar evento"
              value={gestion.filters.search}
              onChange={(event) => gestion.setSearch(event.target.value)}
              className="w-full sm:w-[280px]"
            />
            <EventosFilterBar
              ocultarBorrador
              filters={gestion.filters}
              disciplinas={gestion.disciplinas}
              onEstadoChange={gestion.setEstado}
              onPeriodoChange={gestion.setPeriodo}
              onDisciplinaChange={gestion.setDisciplina}
            />
          </>
        }
      />

      {!gestion.error && !gestion.loading && gestion.eventos.length > 0 && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1.5">
          <h2 className="font-grit-body text-base font-medium text-grit-text">Eventos disponibles</h2>
          <p className="font-grit-body text-xs text-grit-muted">
            {gestion.filteredEventos.length} de {gestion.eventos.length} eventos
          </p>
        </div>
      )}

      {renderContent()}

      <CheckinPasos />
    </section>
  );
}
