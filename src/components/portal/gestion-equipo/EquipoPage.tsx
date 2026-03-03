'use client';

import { useEquipo } from '@/hooks/portal/gestion-equipo/useEquipo';
import { EquipoStatsCards } from './EquipoStatsCards';
import { EquipoHeaderFilters } from './EquipoHeaderFilters';
import { EquipoTable } from './EquipoTable';

type EquipoPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando equipo...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      No hay miembros registrados para esta organización.
    </div>
  );
}

export function EquipoPage({ tenantId }: EquipoPageProps) {
  const {
    loading,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    currentPage,
    pageSize,
    totalFiltered,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginatedMembers,
    stats,
    refresh,
  } = useEquipo({ tenantId });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Gestión de Equipo</h1>
        <p className="mt-2 text-sm text-slate-400">
          Visualiza los miembros de tu organización, su estado y roles asignados.
        </p>
      </header>

      {/* Stats always visible when data is loaded */}
      {!loading && !error && <EquipoStatsCards stats={stats} />}

      <EquipoHeaderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        estadoFilter={estadoFilter}
        onEstadoFilterChange={setEstadoFilter}
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
        <EquipoTable
          rows={paginatedMembers}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalFiltered={totalFiltered}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </section>
  );
}
