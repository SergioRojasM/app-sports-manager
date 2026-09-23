'use client';

import { useMisReservas } from '@/hooks/portal/mis-reservas/useMisReservas';
import { MisReservasFiltersPanel } from './MisReservasFiltersPanel';
import { MisReservasTable } from './MisReservasTable';

type MisReservasPageProps = {
  atletaId: string;
};

export function MisReservasPage({ atletaId }: MisReservasPageProps) {
  const {
    loading,
    error,
    disciplines,
    tenantOptions,
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
  } = useMisReservas(atletaId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]">Mis Reservas</h1>
          <p className="text-sm text-grit-subtext">
            Consulta tu historial de reservas de entrenamientos en todas tus organizaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={resultCount === 0}
          className="inline-flex items-center gap-2 rounded-grit-md border border-grit-glass-border px-4 py-2 text-xs font-medium text-grit-subtext transition-colors hover:border-grit-glass-border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">download</span>
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <MisReservasFiltersPanel
        filters={filters}
        onFilterChange={updateFilter}
        onApply={applyFilters}
        onClear={clearFilters}
        disciplines={disciplines}
        tenantOptions={tenantOptions}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Info banner */}
      {!loading && !error && (
        <div className="rounded-grit-md border border-sky-500/30 bg-sky-950/30 px-4 py-2.5 text-xs text-sky-300">
          {hasActiveFilters
            ? `Mostrando ${resultCount} reservas encontradas.`
            : resultCount > 0
              ? 'Mostrando tus últimas 100 reservas. Para obtener más resultados, utiliza los filtros.'
              : null}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-danger/30 p-6 text-sm text-grit-danger">
          <p>{error}</p>
          <button
            type="button"
            onClick={applyFilters}
            className="mt-3 rounded-grit-md border border-grit-danger/40 px-3 py-1 text-xs text-grit-danger transition-colors hover:border-grit-danger/40 hover:text-grit-danger"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
          Cargando reservas...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && resultCount === 0 && (
        <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
          No tienes reservas registradas todavía.
        </div>
      )}

      {/* Table */}
      {!loading && !error && resultCount > 0 && (
        <MisReservasTable
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
