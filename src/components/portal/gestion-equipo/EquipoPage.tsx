'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEquipo } from '@/hooks/portal/gestion-equipo/useEquipo';
import { useSolicitudesAdmin } from '@/hooks/portal/gestion-solicitudes/useSolicitudesAdmin';
import { useBloqueados } from '@/hooks/portal/gestion-solicitudes/useBloqueados';
import { EquipoStatsCards } from './EquipoStatsCards';
import { EquipoHeaderFilters } from './EquipoHeaderFilters';
import { EquipoTable } from './EquipoTable';
import { AsignarNivelModal } from './AsignarNivelModal';
import { EditarPerfilMiembroModal } from './EditarPerfilMiembroModal';
import { EliminarMiembroModal } from './EliminarMiembroModal';
import { BloquearMiembroModal } from './BloquearMiembroModal';
import { SolicitudesTab } from './gestion-solicitudes/SolicitudesTab';
import { BloqueadosTab } from './gestion-solicitudes/BloqueadosTab';
import type { MiembroTableItem } from '@/types/portal/equipo.types';

type EquipoPageProps = {
  tenantId: string;
};

type ActiveTab = 'equipo' | 'solicitudes' | 'bloqueados';

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
  const { user } = useAuth();

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
    editarPerfil,
    eliminarDelEquipo,
    bloquearDelEquipo,
  } = useEquipo({ tenantId });

  const solicitudesAdmin = useSolicitudesAdmin({ tenantId });
  const bloqueadosAdmin = useBloqueados({ tenantId });

  const [activeTab, setActiveTab] = useState<ActiveTab>('equipo');
  const [asignarNivelTarget, setAsignarNivelTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<MiembroTableItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MiembroTableItem | null>(null);
  const [blockTarget, setBlockTarget] = useState<MiembroTableItem | null>(null);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Gestión de Equipo</h1>
        <p className="mt-2 text-sm text-slate-400">
          Visualiza los miembros de tu organización, su estado y roles asignados.
        </p>
      </header>

      {/* Tab bar */}
      <nav className="flex gap-1 rounded-lg border border-portal-border bg-navy-deep/60 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('equipo')}
          className={[
            'rounded-md px-4 py-2 text-sm font-semibold transition',
            activeTab === 'equipo'
              ? 'bg-navy-soft text-slate-100'
              : 'text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          Equipo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('solicitudes')}
          className={[
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition',
            activeTab === 'solicitudes'
              ? 'bg-navy-soft text-slate-100'
              : 'text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          Solicitudes
          {solicitudesAdmin.pendingCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-turquoise px-1.5 text-[11px] font-bold text-navy-deep">
              {solicitudesAdmin.pendingCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bloqueados')}
          className={[
            'rounded-md px-4 py-2 text-sm font-semibold transition',
            activeTab === 'bloqueados'
              ? 'bg-navy-soft text-slate-100'
              : 'text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          Bloqueados
        </button>
      </nav>

      {/* Equipo tab content */}
      {activeTab === 'equipo' ? (
        <>
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
              onAsignarNivel={(usuarioId) => setAsignarNivelTarget(usuarioId)}
              onEditarPerfil={(row) => setEditTarget(row)}
              onEliminar={(row) => setRemoveTarget(row)}
              onBloquear={(row) => setBlockTarget(row)}
            />
          ) : null}

          {asignarNivelTarget ? (
            <AsignarNivelModal
              open
              tenantId={tenantId}
              usuarioId={asignarNivelTarget}
              onClose={() => setAsignarNivelTarget(null)}
            />
          ) : null}

          <EditarPerfilMiembroModal
            miembro={editTarget}
            onClose={() => setEditTarget(null)}
            onSave={editarPerfil}
          />

          <EliminarMiembroModal
            miembro={removeTarget}
            onClose={() => setRemoveTarget(null)}
            onConfirm={async () => {
              if (!removeTarget) return;
              await eliminarDelEquipo({ miembro_id: removeTarget.miembro_id, tenant_id: tenantId });
            }}
          />

          <BloquearMiembroModal
            miembro={blockTarget}
            onClose={() => setBlockTarget(null)}
            onConfirm={async (motivo) => {
              if (!blockTarget || !user) return;
              await bloquearDelEquipo({
                miembro_id: blockTarget.miembro_id,
                tenant_id: tenantId,
                usuario_id: blockTarget.usuario_id,
                bloqueado_por: user.id,
                motivo,
              });
            }}
          />
        </>
      ) : null}

      {/* Solicitudes tab content */}
      {activeTab === 'solicitudes' ? (
        <SolicitudesTab
          solicitudes={solicitudesAdmin.solicitudes}
          loading={solicitudesAdmin.loading}
          error={solicitudesAdmin.error}
          aceptar={solicitudesAdmin.aceptar}
          rechazar={solicitudesAdmin.rechazar}
          bloquear={solicitudesAdmin.bloquear}
          refresh={solicitudesAdmin.refresh}
          currentUserId={user?.id ?? ''}
        />
      ) : null}

      {/* Bloqueados tab content */}
      {activeTab === 'bloqueados' ? (
        <BloqueadosTab
          bloqueados={bloqueadosAdmin.bloqueados}
          loading={bloqueadosAdmin.loading}
          error={bloqueadosAdmin.error}
          desbloquear={bloqueadosAdmin.desbloquear}
          refresh={bloqueadosAdmin.refresh}
        />
      ) : null}
    </section>
  );
}
