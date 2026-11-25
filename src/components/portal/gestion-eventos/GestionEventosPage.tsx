'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GritAlert, GritButton, GritEmptyState, GritPageHeader } from '@/components/ui';
import { useGestionEventos, EVENTOS_PAGE_SIZE } from '@/hooks/portal/gestion-eventos/useGestionEventos';
import { useEventosVista } from '@/hooks/portal/gestion-eventos/useEventosVista';
import { useEventosCalendar } from '@/hooks/portal/gestion-eventos/useEventosCalendar';
import { useEventoGuardadoBanner } from '@/hooks/portal/gestion-eventos/useEventoGuardadoBanner';
import { useCambiarActivoEvento } from '@/hooks/portal/gestion-eventos/useCambiarActivoEvento';
import { useProximoEvento } from '@/hooks/portal/gestion-eventos/useProximoEvento';
import { EventosHeaderTools } from './EventosHeaderTools';
import { EventosFilterBar } from './EventosFilterBar';
import { ProximoEventoPanel } from './ProximoEventoPanel';
import { EventosStatsCards } from './EventosStatsCards';
import { EventosGrid, EventosGridSkeleton } from './EventosGrid';
import { EventosTable, EventosTableSkeleton } from './EventosTable';
import { EventosCalendar } from './EventosCalendar';
import { CambiarEstadoEventoModal } from './CambiarEstadoEventoModal';
import { EliminarEventoModal } from './EliminarEventoModal';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type GestionEventosPageProps = {
  tenantId: string;
};

type ModalState =
  | { kind: 'estado'; evento: EventoListItem; target: EventoEstado }
  | { kind: 'eliminar'; evento: EventoListItem }
  | null;

/**
 * Route-agnostic on purpose: a later phase mounts this same component on a separate
 * trainer route under (shared), so it must depend only on `tenantId` (US-0118).
 * Create/edit happen in the full-page wizard (US-0119).
 */
export function GestionEventosPage({ tenantId }: GestionEventosPageProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const { vista, setVista } = useEventosVista();
  const guardadoBanner = useEventoGuardadoBanner();
  const gestion = useGestionEventos(tenantId);
  const calendar = useEventosCalendar({
    tenantId,
    enabled: vista === 'calendario',
    filter: gestion.matchesCalendarFilters,
  });

  const { eventos, matchesCalendarFilters, setPeriodo } = gestion;
  const proximo = useProximoEvento(eventos, { enabled: vista === 'calendario' && !gestion.loading });
  const { reload: reloadProximo } = proximo;
  const undatedCount = useMemo(
    () => eventos.filter((evento) => evento.fechaHora === null && matchesCalendarFilters(evento)).length,
    [eventos, matchesCalendarFilters],
  );

  const basePath = `/portal/orgs/${tenantId}/gestion-eventos`;
  const onNuevo = useCallback(() => router.push(`${basePath}/nuevo`), [basePath, router]);
  const onEditar = useCallback(
    (evento: EventoListItem) => router.push(`${basePath}/${evento.id}/editar`),
    [basePath, router],
  );
  const onCambiarEstado = useCallback(
    (evento: EventoListItem, target: EventoEstado) => setModal({ kind: 'estado', evento, target }),
    [],
  );
  const onEliminar = useCallback((evento: EventoListItem) => setModal({ kind: 'eliminar', evento }), []);
  const onVerCompras = useCallback(
    (evento: EventoListItem) => router.push(`${basePath}/${evento.id}/compras`),
    [basePath, router],
  );
  const onControlIngreso = useCallback(
    (evento: EventoListItem) => router.push(`/portal/orgs/${tenantId}/control-ingreso/${evento.id}`),
    [router, tenantId],
  );
  const onDuplicar = useCallback(
    (evento: EventoListItem) => router.push(`${basePath}/nuevo?duplicar=${evento.id}`),
    [basePath, router],
  );
  const closeModal = useCallback(() => setModal(null), []);

  const { reload } = gestion;
  const { reload: reloadCalendar } = calendar;
  const handleMutationSuccess = useCallback(() => {
    setModal(null);
    void reload();
    if (vista === 'calendario') {
      void reloadCalendar();
      reloadProximo();
    }
  }, [reload, reloadCalendar, reloadProximo, vista]);

  // Quick activar/desactivar: no modal, a short confirmation message and a refresh
  const [activoMessage, setActivoMessage] = useState<string | null>(null);
  const handleActivoSuccess = useCallback(
    (evento: EventoListItem, activo: boolean) => {
      setActivoMessage(
        activo
          ? `"${evento.nombre}" está activo: se publica en el panel de eventos públicos.`
          : `"${evento.nombre}" está inactivo: solo será visible para el administrador.`,
      );
      void reload();
      if (vista === 'calendario') {
        void reloadCalendar();
        reloadProximo();
      }
    },
    [reload, reloadCalendar, reloadProximo, vista],
  );
  const cambiarActivo = useCambiarActivoEvento({ tenantId, onSuccess: handleActivoSuccess });
  const { toggle: toggleActivo, clearError: clearActivoError } = cambiarActivo;
  const onCambiarActivo = useCallback(
    (evento: EventoListItem) => {
      setActivoMessage(null);
      void toggleActivo(evento);
    },
    [toggleActivo],
  );

  const showUndated = useCallback(() => {
    setPeriodo('proximos');
    setVista('lista');
  }, [setPeriodo, setVista]);

  const nuevoButton = (
    <GritButton icon="add" onClick={onNuevo}>
      Nuevo evento
    </GritButton>
  );

  const filterProps = {
    filters: gestion.filters,
    disciplinas: gestion.disciplinas,
    onEstadoChange: gestion.setEstado,
    onPeriodoChange: gestion.setPeriodo,
    onDisciplinaChange: gestion.setDisciplina,
  };

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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EventosCalendar
            monthLabel={calendar.monthLabel}
            monthStartDate={calendar.monthStartDate}
            eventosByDate={calendar.eventosByDate}
            selectedDateKey={calendar.selectedDateKey}
            selectedDayEventos={calendar.selectedDayEventos}
            undatedCount={undatedCount}
            loading={calendar.loading}
            error={calendar.error}
            isCurrentMonth={calendar.isCurrentMonth}
            filters={<EventosFilterBar {...filterProps} sinPeriodo layout="inline" />}
            onPreviousMonth={calendar.goPrevious}
            onNextMonth={calendar.goNext}
            onToday={calendar.goToday}
            onSelectDate={calendar.selectDate}
            onRetry={() => void calendar.reload()}
            onShowUndated={showUndated}
            onEditar={onEditar}
            onCambiarEstado={onCambiarEstado}
            onEliminar={onEliminar}
            onCambiarActivo={onCambiarActivo}
            onVerCompras={onVerCompras}
            onControlIngreso={onControlIngreso}
            onDuplicar={onDuplicar}
          />
          {!gestion.loading && <ProximoEventoPanel tenantId={tenantId} evento={proximo.evento} resumen={proximo.resumen} />}
        </div>
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
          onCambiarActivo={onCambiarActivo}
          onVerCompras={onVerCompras}
          onControlIngreso={onControlIngreso}
          onDuplicar={onDuplicar}
        />
      );
    }

    return (
      <EventosGrid
        eventos={gestion.filteredEventos}
        onEditar={onEditar}
        onCambiarEstado={onCambiarEstado}
        onEliminar={onEliminar}
        onCambiarActivo={onCambiarActivo}
        onVerCompras={onVerCompras}
        onControlIngreso={onControlIngreso}
        onDuplicar={onDuplicar}
      />
    );
  };

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Gestiona tus"
        titleAccent="eventos."
        italic
        actions={
          <EventosHeaderTools
            vista={vista}
            onVistaChange={setVista}
            search={gestion.filters.search}
            onSearchChange={gestion.setSearch}
            onNuevo={onNuevo}
          />
        }
      />

      {guardadoBanner.message && (
        <GritAlert tone="success" onDismiss={guardadoBanner.dismiss}>
          {guardadoBanner.message}
        </GritAlert>
      )}

      {activoMessage && (
        <GritAlert tone="success" onDismiss={() => setActivoMessage(null)}>
          {activoMessage}
        </GritAlert>
      )}

      {cambiarActivo.error && (
        <GritAlert tone="danger" onDismiss={clearActivoError}>
          {cambiarActivo.error}
        </GritAlert>
      )}

      {!gestion.error && <EventosStatsCards stats={gestion.stats} loading={gestion.loading} />}

      {vista !== 'calendario' && !gestion.error && (gestion.loading || gestion.eventos.length > 0) && (
        <EventosFilterBar {...filterProps} onClear={gestion.clearFilters} hasActiveFilters={gestion.hasActiveFilters} />
      )}

      {renderContent()}

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
