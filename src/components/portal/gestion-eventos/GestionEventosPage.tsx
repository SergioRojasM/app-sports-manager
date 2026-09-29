'use client';

import { useCallback, useMemo, useState } from 'react';
import { GritButton, GritEmptyState, GritPageHeader } from '@/components/ui';
import { useGestionEventos, EVENTOS_PAGE_SIZE } from '@/hooks/portal/gestion-eventos/useGestionEventos';
import { useEventosVista } from '@/hooks/portal/gestion-eventos/useEventosVista';
import { useEventosCalendar } from '@/hooks/portal/gestion-eventos/useEventosCalendar';
import { EventosToolbar } from './EventosToolbar';
import { EventosStatsCards } from './EventosStatsCards';
import { EventosGrid, EventosGridSkeleton } from './EventosGrid';
import { EventosTable, EventosTableSkeleton } from './EventosTable';
import { EventosCalendar } from './EventosCalendar';
import { CambiarEstadoEventoModal } from './CambiarEstadoEventoModal';
import { EliminarEventoModal } from './EliminarEventoModal';
import { EventoProximamenteModal } from './EventoProximamenteModal';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type GestionEventosPageProps = {
  tenantId: string;
};

type ModalState =
  | { kind: 'proximamente'; mode: 'crear' | 'editar' }
  | { kind: 'estado'; evento: EventoListItem; target: EventoEstado }
  | { kind: 'eliminar'; evento: EventoListItem }
  | null;

/**
 * Route-agnostic on purpose: phase 2 mounts this same component on a separate
 * trainer route under (shared), so it must depend only on `tenantId` (US-0118).
 */
export function GestionEventosPage({ tenantId }: GestionEventosPageProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const { vista, setVista } = useEventosVista();
  const gestion = useGestionEventos(tenantId);
  const calendar = useEventosCalendar({
    tenantId,
    enabled: vista === 'calendario',
    filter: gestion.matchesCalendarFilters,
  });

  const { eventos, matchesCalendarFilters, setPeriodo } = gestion;
  const undatedCount = useMemo(
    () => eventos.filter((evento) => evento.fechaHora === null && matchesCalendarFilters(evento)).length,
    [eventos, matchesCalendarFilters],
  );

  // Phase 2 replaces these two seams with the event form
  const onNuevo = useCallback(() => setModal({ kind: 'proximamente', mode: 'crear' }), []);
  const onEditar = useCallback(() => setModal({ kind: 'proximamente', mode: 'editar' }), []);
  const onCambiarEstado = useCallback(
    (evento: EventoListItem, target: EventoEstado) => setModal({ kind: 'estado', evento, target }),
    [],
  );
  const onEliminar = useCallback((evento: EventoListItem) => setModal({ kind: 'eliminar', evento }), []);
  const closeModal = useCallback(() => setModal(null), []);

  const { reload } = gestion;
  const { reload: reloadCalendar } = calendar;
  const handleMutationSuccess = useCallback(() => {
    setModal(null);
    void reload();
    if (vista === 'calendario') void reloadCalendar();
  }, [reload, reloadCalendar, vista]);

  const showUndated = useCallback(() => {
    setPeriodo('proximos');
    setVista('lista');
  }, [setPeriodo, setVista]);

  const nuevoButton = (
    <GritButton icon="add" onClick={onNuevo}>
      Nuevo evento
    </GritButton>
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

    if (!gestion.loading && gestion.eventos.length === 0) {
      return (
        <GritEmptyState
          icon="event"
          title="Aún no hay eventos"
          description="Crea el primer evento de tu equipo."
          action={nuevoButton}
        />
      );
    }

    if (vista === 'calendario') {
      return (
        <EventosCalendar
          monthLabel={calendar.monthLabel}
          monthStartDate={calendar.monthStartDate}
          eventosByDate={calendar.eventosByDate}
          selectedDateKey={calendar.selectedDateKey}
          selectedDayEventos={calendar.selectedDayEventos}
          undatedCount={undatedCount}
          loading={calendar.loading}
          error={calendar.error}
          onPreviousMonth={calendar.goPrevious}
          onNextMonth={calendar.goNext}
          onSelectDate={calendar.selectDate}
          onRetry={() => void calendar.reload()}
          onShowUndated={showUndated}
          onEditar={onEditar}
          onCambiarEstado={onCambiarEstado}
          onEliminar={onEliminar}
        />
      );
    }

    if (gestion.loading) {
      return vista === 'lista' ? <EventosTableSkeleton /> : <EventosGridSkeleton />;
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

    if (vista === 'lista') {
      return (
        <EventosTable
          eventos={gestion.paginatedEventos}
          currentPage={gestion.currentPage}
          totalPages={gestion.totalPages}
          totalFiltered={gestion.filteredEventos.length}
          pageSize={EVENTOS_PAGE_SIZE}
          onPageChange={gestion.setCurrentPage}
          onEditar={onEditar}
          onCambiarEstado={onCambiarEstado}
          onEliminar={onEliminar}
        />
      );
    }

    return (
      <EventosGrid
        eventos={gestion.filteredEventos}
        onEditar={onEditar}
        onCambiarEstado={onCambiarEstado}
        onEliminar={onEliminar}
      />
    );
  };

  return (
    <section className="space-y-6">
      <GritPageHeader title="Eventos" subtitle="Gestiona los eventos de tu equipo" actions={nuevoButton} />

      <EventosToolbar
        vista={vista}
        onVistaChange={setVista}
        filters={gestion.filters}
        disciplinas={gestion.disciplinas}
        onSearchChange={gestion.setSearch}
        onEstadoChange={gestion.setEstado}
        onPeriodoChange={gestion.setPeriodo}
        onDisciplinaChange={gestion.setDisciplinaId}
      />

      {!gestion.loading && !gestion.error && <EventosStatsCards stats={gestion.stats} />}

      {renderContent()}

      {modal?.kind === 'proximamente' && <EventoProximamenteModal mode={modal.mode} onClose={closeModal} />}

      {modal?.kind === 'estado' && (
        <CambiarEstadoEventoModal
          tenantId={tenantId}
          evento={modal.evento}
          target={modal.target}
          onClose={closeModal}
          onSuccess={handleMutationSuccess}
        />
      )}

      {modal?.kind === 'eliminar' && (
        <EliminarEventoModal
          tenantId={tenantId}
          evento={modal.evento}
          onClose={closeModal}
          onSuccess={handleMutationSuccess}
        />
      )}
    </section>
  );
}
