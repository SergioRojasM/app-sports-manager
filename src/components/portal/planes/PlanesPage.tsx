'use client';

import { usePlanes } from '@/hooks/portal/planes/usePlanes';
import { PlanFormModal } from './PlanFormModal';
import { PlanesHeaderFilters } from './PlanesHeaderFilters';
import { PlanesTable } from './PlanesTable';

type PlanesPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando planes...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      No hay planes registrados para esta organización.
    </div>
  );
}

export function PlanesPage({ tenantId }: PlanesPageProps) {
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
    submitError,
    successMessage,
    isSubmitting,
    openCreateModal,
    openEditModal,
    deletePlan,
    closeModal,
    updateField,
    addTipo,
    updateTipo,
    removeTipo,
    submit,
    refresh,
  } = usePlanes({ tenantId });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Planes de Membresía</h1>
        <p className="mt-2 text-sm text-slate-400">
          Crea y administra los planes de membresía de tu organización.
        </p>
      </header>

      <PlanesHeaderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreatePlan={openCreateModal}
      />

      {successMessage ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      {submitError && !modalOpen ? (
        <div className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
          {submitError}
        </div>
      ) : null}

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

      {!loading && !error && filteredPlanes.length === 0 ? <EmptyState /> : null}

      {!loading && !error && filteredPlanes.length > 0 ? (
        <PlanesTable
          rows={filteredPlanes}
          onEdit={openEditModal}
          onDelete={(plan) => void deletePlan(plan)}
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
        onClose={closeModal}
        onSubmit={submit}
        onChangeField={updateField}
        onAddTipo={addTipo}
        onUpdateTipo={updateTipo}
        onRemoveTipo={removeTipo}
      />
    </section>
  );
}
