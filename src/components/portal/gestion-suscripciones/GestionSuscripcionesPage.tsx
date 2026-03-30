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

type GestionSuscripcionesPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando suscripciones...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      No hay suscripciones registradas para esta organización.
    </div>
  );
}

export function GestionSuscripcionesPage({ tenantId }: GestionSuscripcionesPageProps) {
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
    selectedRow,
    modalType,
    openPagoModal,
    openSuscripcionModal,
    openEditarModal,
    openEliminarModal,
    openVerDetalleModal,
    closeModal,
    refresh,
  } = useGestionSuscripciones({ tenantId });

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
        <h1 className="text-3xl font-semibold text-slate-100">Gestión de Suscripciones</h1>
        <p className="mt-2 text-sm text-slate-400">
          Visualiza y administra las suscripciones de tu organización. Valida pagos y aprueba o
          cancela suscripciones.
        </p>
      </header>

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
        <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
          <p className="text-sm text-rose-200">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-semibold text-rose-100"
            onClick={() => void refresh()}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && totalFiltered === 0 ? <EmptyState /> : null}

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
    </section>
  );
}
