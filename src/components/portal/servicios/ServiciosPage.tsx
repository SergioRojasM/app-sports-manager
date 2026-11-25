'use client';

import {
  GritAlert,
  GritButton,
  GritConfirmDialog,
  GritEmptyState,
  GritIcon,
  GritPageHeader,
  GritSearchField,
  GritSegmented,
} from '@/components/ui';
import { useServicios, type ServicioStatusFilter } from '@/hooks/portal/servicios/useServicios';
import type { ServicioFormValues } from '@/types/portal/servicios.types';
import { ServicioFormModal } from './ServicioFormModal';
import { ServiciosTable } from './ServiciosTable';

type ServiciosPageProps = {
  tenantId: string;
};

/** Services catalogue (`v8mqZG` Admin · Servicios). */
export function ServiciosPage({ tenantId }: ServiciosPageProps) {
  const {
    servicios,
    filteredServicios,
    counts,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    planCounts,
    pendingIds,
    toggleActivo,
    toggleError,
    clearToggleError,
    isModalOpen,
    editingServicio,
    submitError,
    successMessage,
    dismissSuccess,
    openCreateModal,
    openEditModal,
    closeModal,
    createServicio,
    updateServicio,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete,
    cancelDelete,
    confirmDelete,
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

  const hasFilters = searchTerm.trim() !== '' || statusFilter !== 'todos';

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Tus"
        titleAccent="servicios."
        italic
        actions={
          <>
            <GritSearchField
              aria-label="Buscar servicio"
              placeholder="Buscar servicio…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full sm:w-[240px]"
            />
            <GritButton icon="add" onClick={openCreateModal}>
              Nuevo servicio
            </GritButton>
          </>
        }
      />

      {successMessage ? (
        <GritAlert tone="success" onDismiss={dismissSuccess}>
          {successMessage}
        </GritAlert>
      ) : null}
      {toggleError ? (
        <GritAlert tone="danger" onDismiss={clearToggleError}>
          {toggleError}
        </GritAlert>
      ) : null}

      {isLoading ? (
        <div role="status">
          <GritEmptyState icon="hourglass_empty" title="Cargando servicios…" />
        </div>
      ) : error ? (
        <GritEmptyState
          icon="error"
          title="No pudimos cargar los servicios"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Reintentar
            </GritButton>
          }
        />
      ) : servicios.length === 0 ? (
        <GritEmptyState
          icon="category"
          title="Aún no tienes servicios"
          description="Crea tu primer servicio para incluirlo en los subtipos de tus planes."
          action={
            <GritButton icon="add" onClick={openCreateModal}>
              Nuevo servicio
            </GritButton>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <GritSegmented<ServicioStatusFilter>
              ariaLabel="Estado de los servicios"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'todos', label: 'Todos', count: counts.todos },
                { value: 'activos', label: 'Activos', count: counts.activos },
                { value: 'inactivos', label: 'Inactivos', count: counts.inactivos },
              ]}
            />
            <p className="flex items-center gap-2 font-grit-body text-xs text-grit-muted">
              <GritIcon name="info" size={14} className="text-grit-cyan" />
              Los servicios se agrupan dentro de tus planes
            </p>
          </div>
          {filteredServicios.length === 0 && hasFilters ? (
            <GritEmptyState
              icon="search_off"
              title="Sin resultados"
              description="Ningún servicio coincide con la búsqueda o el filtro."
              action={
                <GritButton
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('todos');
                  }}
                >
                  Limpiar filtros
                </GritButton>
              }
            />
          ) : (
            <ServiciosTable
              rows={filteredServicios}
              planCounts={planCounts}
              pendingIds={pendingIds}
              onToggle={(servicio, activo) => void toggleActivo(servicio, activo)}
              onEdit={openEditModal}
              onDelete={requestDelete}
            />
          )}
        </>
      )}

      <ServicioFormModal
        open={isModalOpen}
        mode={editingServicio ? 'edit' : 'create'}
        editingServicio={editingServicio}
        submitError={submitError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar servicio"
        message={
          <>
            ¿Seguro que quieres eliminar <span className="font-semibold text-grit-text">{deleteTarget?.nombre}</span>? Esta
            acción no se puede deshacer.
          </>
        }
        pending={isDeleting}
        error={deleteError}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
