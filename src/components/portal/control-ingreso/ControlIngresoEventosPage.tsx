'use client';

import { GritButton, GritEmptyState, GritPageHeader } from '@/components/ui';
import { EventosTable, EventosTableSkeleton } from '@/components/portal/gestion-eventos/EventosTable';
import { EventosToolbar } from '@/components/portal/gestion-eventos/EventosToolbar';
import { EVENTOS_PAGE_SIZE, useGestionEventos } from '@/hooks/portal/gestion-eventos/useGestionEventos';
import type { EventoListItem } from '@/types/portal/eventos.types';

type ControlIngresoEventosPageProps = {
  tenantId: string;
};

/**
 * "Eventos Check-in" (US-0131): the same list view and filters as "Eventos" (search, estado,
 * periodo, disciplina), without drafts, with "Control de ingreso" as the row action instead of the
 * admin menu. "Próximos" counts from today 00:00 Bogotá so an event in progress stays listed.
 */
export function ControlIngresoEventosPage({ tenantId }: ControlIngresoEventosPageProps) {
  const gestion = useGestionEventos(tenantId, { excluirBorradores: true, proximosDesdeHoy: true });

  const renderAcciones = (evento: EventoListItem) =>
    evento.estado === 'confirmado' ? (
      <GritButton
        size="sm"
        variant="outline-accent"
        icon="qr_code_scanner"
        href={`/portal/orgs/${tenantId}/control-ingreso/${evento.id}`}
      >
        Control de ingreso
      </GritButton>
    ) : (
      <span className="font-grit-body text-xs text-grit-muted">Evento cancelado</span>
    );

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

    if (gestion.loading) return <EventosTableSkeleton />;

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
      <EventosTable
        eventos={gestion.paginatedEventos}
        currentPage={gestion.currentPage}
        totalPages={gestion.totalPages}
        totalFiltered={gestion.filteredEventos.length}
        pageSize={EVENTOS_PAGE_SIZE}
        onPageChange={gestion.setCurrentPage}
        renderAcciones={renderAcciones}
      />
    );
  };

  return (
    <section className="space-y-6">
      <GritPageHeader
        eyebrow="Eventos Check-in"
        title="Control de ingreso"
        subtitle="Elige el evento para validar las entradas de los asistentes."
      />

      <EventosToolbar
        ocultarBorrador
        filters={gestion.filters}
        disciplinas={gestion.disciplinas}
        onSearchChange={gestion.setSearch}
        onEstadoChange={gestion.setEstado}
        onPeriodoChange={gestion.setPeriodo}
        onDisciplinaChange={gestion.setDisciplina}
      />

      {renderContent()}
    </section>
  );
}
