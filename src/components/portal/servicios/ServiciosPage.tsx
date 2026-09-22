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
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando servicios...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-4xl text-grit-muted" aria-hidden="true">
        category
      </span>
      <p className="text-sm font-medium text-grit-subtext">No hay servicios registrados.</p>
      <p className="mt-1 text-xs text-grit-muted">
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
          <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]">Servicios</h1>
          <p className="mt-2 text-sm text-grit-subtext">
            Gestiona el catálogo de servicios de la organización.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2.5 text-sm font-semibold text-grit-bg transition-all duration-200 hover:bg-grit-cyan/85 hover:shadow-lg hover:shadow-grit-cyan/25"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
          Nuevo servicio
        </button>
      </header>

      {successMessage ? (
        <div
          className="rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      {deleteError ? (
        <div
          className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
          role="alert"
        >
          {deleteError}
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}

      {!isLoading && error ? (
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
