'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { useGestionSuscripciones } from '@/hooks/portal/gestion-suscripciones/useGestionSuscripciones';
import { SuscripcionesStatsCards } from './SuscripcionesStatsCards';
import { SuscripcionesHeaderFilters } from './SuscripcionesHeaderFilters';
import { SuscripcionesTable } from './SuscripcionesTable';
import { ValidarPagoModal } from './ValidarPagoModal';
import { ValidarSuscripcionModal } from './ValidarSuscripcionModal';
import { EditarSuscripcionModal } from './EditarSuscripcionModal';
import { EliminarSuscripcionModal } from './EliminarSuscripcionModal';
import { VerDetallePagoModal } from './VerDetallePagoModal';
import { VerServiciosModal } from './VerServiciosModal';
import { CrearSuscripcionModal } from './CrearSuscripcionModal';
import type { SuscripcionTab } from '@/types/portal/gestion-suscripciones.types';

type GestionSuscripcionesPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando suscripciones...
    </div>
  );
}

function EmptyState({ activeTab }: { activeTab: SuscripcionTab }) {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      {activeTab === 'miembros'
        ? 'No hay suscripciones de miembros para esta organización.'
        : 'No hay suscripciones de no miembros para esta organización.'}
    </div>
  );
}

export function GestionSuscripcionesPage({ tenantId }: GestionSuscripcionesPageProps) {
  const [activeTab, setActiveTab] = useState<SuscripcionTab>('miembros');

  const {
    loading,
    error,
    searchTerm,
    setSearchTerm,
    suscripcionFilter,
    setSuscripcionFilter,
    pagoFilter,
    setPagoFilter,
    currentPage,
    pageSize,
    totalFiltered,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginatedRows,
    stats,
    tabCounts,
    selectedRow,
    modalType,
    openPagoModal,
    openSuscripcionModal,
    openEditarModal,
    openEliminarModal,
    openVerDetalleModal,
    openVerServiciosModal,
    openCrearModal,
    closeModal,
    refresh,
  } = useGestionSuscripciones({ tenantId, activeTab });

  /* ── Admin user ID for pago validation ── */
  const [adminUserId, setAdminUserId] = useState<string>('');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAdminUserId(data.user.id);
    });
  }, [supabase]);

  /* ── Modal success callback ── */
  const handleModalSuccess = useCallback(() => {
    closeModal();
    void refresh();
  }, [closeModal, refresh]);

  return (
    <section className="space-y-6">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]">Gestión de Suscripciones</h1>
            <p className="mt-2 text-sm text-grit-subtext">
              Visualiza y administra las suscripciones de tu organización. Valida pagos y aprueba o
              cancela suscripciones.
            </p>
          </div>
          <button
            type="button"
            onClick={openCrearModal}
            className="shrink-0 rounded-grit-md border border-grit-cyan/40 bg-grit-cyan/10 px-4 py-2 text-sm font-medium text-grit-cyan transition-colors hover:bg-grit-cyan/20"
          >
            + Nueva suscripción
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex gap-1 rounded-grit-md border border-grit-glass-border bg-grit-bg/60 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('miembros')}
          className={[
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition',
            activeTab === 'miembros'
              ? 'bg-grit-card text-grit-text'
              : 'text-grit-subtext hover:text-grit-text',
          ].join(' ')}
        >
          Miembros
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-grit-cyan px-1.5 text-[11px] font-bold text-grit-bg">
            {tabCounts.miembros}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('no_miembros')}
          className={[
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition',
            activeTab === 'no_miembros'
              ? 'bg-grit-card text-grit-text'
              : 'text-grit-subtext hover:text-grit-text',
          ].join(' ')}
        >
          No miembros
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-grit-cyan px-1.5 text-[11px] font-bold text-grit-bg">
            {tabCounts.noMiembros}
          </span>
        </button>
      </nav>

      {/* Stats always visible when data is loaded */}
      {!loading && !error && <SuscripcionesStatsCards stats={stats} />}

      <SuscripcionesHeaderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        suscripcionFilter={suscripcionFilter}
        onSuscripcionFilterChange={setSuscripcionFilter}
        pagoFilter={pagoFilter}
        onPagoFilterChange={setPagoFilter}
      />

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="border backdrop-blur-md rounded-grit-2xl border-grit-danger/25 bg-grit-danger/10 p-6">
          <p className="text-sm text-grit-danger">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-grit-md border border-grit-danger/30 px-3 py-2 text-xs font-semibold text-grit-danger"
            onClick={() => void refresh()}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && totalFiltered === 0 ? <EmptyState activeTab={activeTab} /> : null}

      {!loading && !error && totalFiltered > 0 ? (
        <SuscripcionesTable
          rows={paginatedRows}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalFiltered={totalFiltered}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onValidarPago={openPagoModal}
          onValidarSuscripcion={openSuscripcionModal}
          onEditar={openEditarModal}
          onEliminar={openEliminarModal}
          onVerDetallePago={openVerDetalleModal}
          onVerServicios={openVerServiciosModal}
        />
      ) : null}

      {/* Modals */}
      {selectedRow && modalType === 'pago' && (
        <ValidarPagoModal
          row={selectedRow}
          adminUserId={adminUserId}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {selectedRow && modalType === 'suscripcion' && (
        <ValidarSuscripcionModal
          row={selectedRow}
          adminUserId={adminUserId}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {selectedRow && modalType === 'editar' && (
        <EditarSuscripcionModal
          row={selectedRow}
          tenantId={tenantId}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {selectedRow && modalType === 'eliminar' && (
        <EliminarSuscripcionModal
          row={selectedRow}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {selectedRow && modalType === 'verDetalle' && (
        <VerDetallePagoModal
          row={selectedRow}
          onClose={closeModal}
        />
      )}

      {selectedRow && modalType === 'verServicios' && (
        <VerServiciosModal
          row={selectedRow}
          onClose={closeModal}
        />
      )}

      <CrearSuscripcionModal
        open={modalType === 'crear'}
        tenantId={tenantId}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
    </section>
  );
}
