'use client';

import { useEffect, useState } from 'react';
import {
  GritAlert,
  GritButton,
  GritConfirmDialog,
  GritEmptyState,
  GritPageHeader,
  GritSearchField,
} from '@/components/ui';
import { usePlanes } from '@/hooks/portal/planes/usePlanes';
import { serviciosService } from '@/services/supabase/portal/servicios.service';
import type { Servicio } from '@/types/portal/servicios.types';
import { PlanCard } from './PlanCard';
import { PlanFormModal } from './PlanFormModal';

type PlanesPageProps = {
  tenantId: string;
};

/** Administrator plans catalogue (`J7Lw7d` Admin · Planes): header, feedback, plan card grid. */
export function PlanesPage({ tenantId }: PlanesPageProps) {
  const [availableServices, setAvailableServices] = useState<Servicio[]>([]);

  useEffect(() => {
    serviciosService
      .getServiciosActivosByTenant(tenantId)
      .then(setAvailableServices)
      .catch(() => setAvailableServices([]));
  }, [tenantId]);

  const {
    planes,
    loading,
    error,
    filteredPlanes,
    disciplines,
    searchTerm,
    setSearchTerm,
    modalOpen,
    modalMode,
    formValues,
    fieldErrors,
    tiposForm,
    tiposErrors,
    tiposGlobalError,
    tiposServiceRows,
    submitError,
    successMessage,
    dismissSuccess,
    isSubmitting,
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete,
    cancelDelete,
    confirmDelete,
    closeModal,
    updateField,
    setEstado,
    addTipo,
    updateTipo,
    removeTipo,
    updateTipoServiceRows,
    submit,
    refresh,
  } = usePlanes({ tenantId });

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Planes de"
        titleAccent="membresía."
        italic
        actions={
          <>
            <GritSearchField
              aria-label="Buscar plan"
              placeholder="Buscar plan…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full sm:w-[220px]"
            />
            <GritButton icon="add" onClick={openCreateModal}>
              Nuevo plan
            </GritButton>
          </>
        }
      />

      {successMessage ? (
        <GritAlert tone="success" onDismiss={dismissSuccess}>
          {successMessage}
        </GritAlert>
      ) : null}

      {submitError && !modalOpen ? <GritAlert tone="danger">{submitError}</GritAlert> : null}

      {loading ? (
        <div role="status">
          <GritEmptyState icon="hourglass_empty" title="Cargando planes…" />
        </div>
      ) : error ? (
        <GritEmptyState
          icon="error"
          title="No pudimos cargar los planes"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Reintentar
            </GritButton>
          }
        />
      ) : planes.length === 0 ? (
        <GritEmptyState
          icon="card_membership"
          title="Aún no tienes planes"
          description="Crea tu primer plan de membresía para que tus atletas puedan suscribirse."
          action={
            <GritButton icon="add" onClick={openCreateModal}>
              Nuevo plan
            </GritButton>
          }
        />
      ) : filteredPlanes.length === 0 ? (
        <GritEmptyState
          icon="search_off"
          title="Sin resultados"
          description="Ningún plan coincide con la búsqueda."
          action={
            <GritButton variant="secondary" onClick={() => setSearchTerm('')}>
              Limpiar búsqueda
            </GritButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredPlanes.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              disciplinaNames={plan.disciplinaNames}
              mode="admin"
              onEdit={(target) => void openEditModal(target)}
              onDuplicate={openDuplicateModal}
              onDelete={requestDelete}
            />
          ))}
        </div>
      )}

      <PlanFormModal
        open={modalOpen}
        mode={modalMode}
        isSubmitting={isSubmitting}
        values={formValues}
        fieldErrors={fieldErrors}
        submitError={submitError}
        disciplines={disciplines}
        tiposForm={tiposForm}
        tiposErrors={tiposErrors}
        tiposGlobalError={tiposGlobalError}
        tiposServiceRows={tiposServiceRows}
        availableServices={availableServices}
        onClose={closeModal}
        onSubmit={submit}
        onChangeField={updateField}
        onChangeEstado={setEstado}
        onAddTipo={addTipo}
        onUpdateTipo={updateTipo}
        onRemoveTipo={removeTipo}
        onUpdateTipoServiceRows={updateTipoServiceRows}
      />

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar plan"
        message={
          <>
            ¿Seguro que quieres eliminar el plan <span className="font-semibold text-grit-text">{deleteTarget?.nombre}</span>?
            Esta acción no se puede deshacer.
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
