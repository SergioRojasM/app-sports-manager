'use client';

import { GritButton, GritEmptyState, GritIcon, GritPageHeader, GritPagination } from '@/components/ui';
import { MIS_RESERVAS_CAP, useMisReservas } from '@/hooks/portal/mis-reservas/useMisReservas';
import { MisReservasFilterBar } from './MisReservasFilterBar';
import { MisReservasList } from './MisReservasList';
import { MisReservasStats } from './MisReservasStats';

type MisReservasPageProps = {
  atletaId: string;
};

/** Cross-tenant booking history (grit-arena-v3 frame `x9xdbA`). */
export function MisReservasPage({ atletaId }: MisReservasPageProps) {
  const reservas = useMisReservas(atletaId);
  const { loading, error, rows, hasActiveFilters, resultCount, currentPage, totalPages, pageSize, totalFiltered } = reservas;

  const firstLoad = loading && rows.length === 0 && !error;
  const showList = rows.length > 0;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="flex flex-col gap-5">
      <GritPageHeader
        title="Mis"
        titleAccent="reservas."
        italic
        actions={
          <GritButton variant="secondary" icon="download" onClick={reservas.exportCsv} disabled={resultCount === 0}>
            Exportar CSV
          </GritButton>
        }
      />

      <MisReservasFilterBar
        filters={reservas.filters}
        onFilterChange={reservas.updateFilter}
        onApplyCustomRange={reservas.applyCustomRange}
        disciplines={reservas.disciplines}
        tenantOptions={reservas.tenantOptions}
      />

      {error && showList ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-grit-danger/30 bg-grit-danger/10 px-4 py-3">
          <p className="font-grit-body text-xs text-grit-danger">No se pudieron actualizar tus reservas. {error}</p>
          <GritButton variant="secondary" size="sm" icon="refresh" onClick={reservas.retry}>
            Reintentar
          </GritButton>
        </div>
      ) : null}

      {firstLoad ? <GritEmptyState icon="hourglass_top" title="Cargando reservas…" /> : null}

      {error && !showList ? (
        <GritEmptyState
          icon="error"
          title="No se pudieron cargar tus reservas"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" size="sm" icon="refresh" onClick={reservas.retry}>
              Reintentar
            </GritButton>
          }
        />
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        hasActiveFilters ? (
          <GritEmptyState
            icon="filter_alt_off"
            title="No hay reservas con estos filtros"
            action={
              <GritButton variant="secondary" size="sm" icon="restart_alt" onClick={reservas.clearFilters}>
                Limpiar filtros
              </GritButton>
            }
          />
        ) : (
          <GritEmptyState
            icon="event_busy"
            title="Aún no tienes reservas"
            description="Cuando reserves un entrenamiento, lo verás aquí."
            action={
              <GritButton href="/portal/orgs" icon="explore">
                Ver organizaciones
              </GritButton>
            }
          />
        )
      ) : null}

      {showList ? (
        <div className={loading ? 'flex flex-col gap-5 opacity-60 transition-opacity' : 'flex flex-col gap-5'} aria-busy={loading}>
          <MisReservasStats stats={reservas.stats} />
          <MisReservasList groups={reservas.pageGroups} />
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 px-2 font-grit-body text-[11px] text-grit-muted">
              <GritIcon name="info" size={13} />
              {reservas.isCapped
                ? `Mostrando tus últimas ${MIS_RESERVAS_CAP} reservas. Usa los filtros para ver más.`
                : `Mostrando ${resultCount} ${resultCount === 1 ? 'reserva' : 'reservas'}.`}
            </p>
            {totalPages > 1 ? (
              <GritPagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={reservas.setCurrentPage}
                summary={`Mostrando ${start}–${end} de ${totalFiltered} reservas`}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
