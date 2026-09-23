'use client';

import { useEffect, useState } from 'react';
import { usePlanes } from '@/hooks/portal/planes/usePlanes';
import { serviciosService } from '@/services/supabase/portal/servicios.service';
import { PlanFormModal } from './PlanFormModal';
import { PlanesHeaderFilters } from './PlanesHeaderFilters';
import { PlanesTable } from './PlanesTable';
import type { Servicio } from '@/types/portal/servicios.types';
import { GritPageHeader } from '@/components/ui';

type PlanesPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando planes...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      No hay planes registrados para esta organización.
    </div>
  );
}

export function PlanesPage({ tenantId }: PlanesPageProps) {
  const [availableServices, setAvailableServices] = useState<Servicio[]>([]);

  useEffect(() => {
    serviciosService
      .getServiciosActivosByTenant(tenantId)
      .then(setAvailableServices)
      .catch(() => setAvailableServices([]));
  }, [tenantId]);

  const {
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
    isSubmitting,
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    deletePlan,
    closeModal,
    updateField,
    addTipo,
    updateTipo,
    removeTipo,
    updateTipoServiceRows,
    submit,
    refresh,
  } = usePlanes({ tenantId });

  return (
    <section className="space-y-6">
      <GritPageHeader title="Planes de Membresía" subtitle="Crea y administra los planes de membresía de tu organización." />

      <PlanesHeaderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreatePlan={openCreateModal}
      />

      {successMessage ? (
        <div className="rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      {submitError && !modalOpen ? (
        <div className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger" role="alert">
          {submitError}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
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

      {!loading && !error && filteredPlanes.length === 0 ? <EmptyState /> : null}

      {!loading && !error && filteredPlanes.length > 0 ? (
        <PlanesTable
          rows={filteredPlanes}
          onEdit={openEditModal}
          onDuplicate={openDuplicateModal}
          onDelete={(plan) => void deletePlan(plan)}
          showVisibilidad
        />
      ) : null}

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
        onAddTipo={addTipo}
        onUpdateTipo={updateTipo}
        onRemoveTipo={removeTipo}
        onUpdateTipoServiceRows={updateTipoServiceRows}
      />
    </section>
  );
}
