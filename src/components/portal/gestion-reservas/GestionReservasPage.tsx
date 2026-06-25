'use client';

import { useGestionReservas } from '@/hooks/portal/gestion-reservas/useGestionReservas';
import { ReservasFiltersPanel } from './ReservasFiltersPanel';
import { ReservasManagementTable } from './ReservasManagementTable';

type GestionReservasPageProps = {
  tenantId: string;
};

export function GestionReservasPage({ tenantId }: GestionReservasPageProps) {
  const {
    loading,
    error,
    disciplines,
    filters,
    updateFilter,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    currentPage,
    pageSize,
    totalFiltered,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginatedRows,
    exportCsv,
    resultCount,
  } = useGestionReservas(tenantId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Gestión de Reservas</h1>
          <p className="text-sm text-slate-400">
            Consulta y filtra las reservas de entrenamientos de la organización.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={resultCount === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-portal-border px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">download</span>
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <ReservasFiltersPanel
        filters={filters}
        onFilterChange={updateFilter}
        onApply={applyFilters}
        onClear={clearFilters}
        disciplines={disciplines}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Info banner */}
      {!loading && !error && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 px-4 py-2.5 text-xs text-sky-300">
          {hasActiveFilters
            ? `Mostrando ${resultCount} reservas encontradas.`
            : resultCount > 0
              ? 'Mostrando las últimas 100 reservas. Para obtener más resultados, utiliza los filtros.'
              : null}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="glass rounded-lg border border-rose-500/30 p-6 text-sm text-rose-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={applyFilters}
            className="mt-3 rounded-lg border border-rose-500/40 px-3 py-1 text-xs text-rose-300 transition-colors hover:border-rose-400 hover:text-rose-200"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
          Cargando reservas...
        </div>
      )}

      {/* Empty state (no error, not loading, no results) */}
      {!loading && !error && resultCount === 0 && (
        <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
          No se encontraron reservas para esta organización.
        </div>
      )}

      {/* Table */}
      {!loading && !error && resultCount > 0 && (
        <ReservasManagementTable
          rows={paginatedRows}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalFiltered={totalFiltered}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
