'use client';

import { useServicios } from '@/hooks/portal/servicios/useServicios';
import { ServicioFormModal } from './ServicioFormModal';
import { ServiciosTable } from './ServiciosTable';
import type { Servicio, ServicioFormValues } from '@/types/portal/servicios.types';

type ServiciosPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando servicios...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-4xl text-slate-500" aria-hidden="true">
        category
      </span>
      <p className="text-sm font-medium text-slate-300">No hay servicios registrados.</p>
      <p className="mt-1 text-xs text-slate-500">
        Crea tu primer servicio para asociarlo a los tipos de plan.
      </p>
    </div>
  );
}

export function ServiciosPage({ tenantId }: ServiciosPageProps) {
  const {
    servicios,
    isLoading,
    error,
    isModalOpen,
    editingServicio,
    submitError,
    successMessage,
    deleteError,
    openCreateModal,
    openEditModal,
    closeModal,
    createServicio,
    updateServicio,
    deleteServicio,
    clearDeleteError,
    refresh,
  } = useServicios({ tenantId });

  const handleSubmit = async (values: ServicioFormValues): Promise<boolean> => {
    if (editingServicio) {
      return updateServicio(editingServicio.id, {
        nombre: values.nombre,
        descripcion: values.descripcion.trim() || null,
        activo: values.activo,
      });
    }
    return createServicio({
      tenant_id: tenantId,
      nombre: values.nombre,
      descripcion: values.descripcion.trim() || null,
      activo: values.activo,
    });
  };

  const handleDelete = (servicio: Servicio) => {
    clearDeleteError();
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar el servicio "${servicio.nombre}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    void deleteServicio(servicio.id);
  };

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">Servicios</h1>
          <p className="mt-2 text-sm text-slate-400">
            Gestiona el catálogo de servicios de la organización.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2.5 text-sm font-semibold text-navy-deep transition-all duration-200 hover:bg-turquoise/85 hover:shadow-lg hover:shadow-turquoise/25"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
          Nuevo servicio
        </button>
      </header>

      {successMessage ? (
        <div
          className="rounded-lg border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      {deleteError ? (
        <div
          className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {deleteError}
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}

      {!isLoading && error ? (
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

      {!isLoading && !error && servicios.length === 0 ? <EmptyState /> : null}

      {!isLoading && !error && servicios.length > 0 ? (
        <ServiciosTable
          rows={servicios}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      ) : null}

      <ServicioFormModal
        open={isModalOpen}
        mode={editingServicio ? 'edit' : 'create'}
        editingServicio={editingServicio}
        submitError={submitError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
