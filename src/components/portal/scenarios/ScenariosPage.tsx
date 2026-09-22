'use client';

import { useScenarios } from '@/hooks/portal/scenarios/useScenarios';
import { ScenarioCard } from './ScenarioCard';
import { ScenarioFormModal } from './ScenarioFormModal';
import { ScenariosHeaderFilters } from './ScenariosHeaderFilters';
import { GritPageHeader } from '@/components/ui';

type ScenariosPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando escenarios...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      No hay escenarios registrados para esta organización.
    </div>
  );
}

export function ScenariosPage({ tenantId }: ScenariosPageProps) {
  const {
    loading,
    error,
    filteredScenarios,
    searchTerm,
    setSearchTerm,
    modalOpen,
    modalMode,
    formValues,
    fieldErrors,
    scheduleErrors,
    submitError,
    successMessage,
    isSubmitting,
    openCreateModal,
    openEditModal,
    deleteScenario,
    closeModal,
    updateField,
    addSchedule,
    removeSchedule,
    updateScheduleField,
    submit,
    refresh,
  } = useScenarios({ tenantId });

  return (
    <section className="space-y-6">
      <GritPageHeader title="Gestión de Escenarios" subtitle="Visualiza, crea y actualiza escenarios de entrenamiento para tu organización." />

      <ScenariosHeaderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateScenario={openCreateModal}
      />

      {successMessage ? (
        <div className="rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
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

      {!loading && !error && filteredScenarios.length === 0 ? <EmptyState /> : null}

      {!loading && !error && filteredScenarios.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onEdit={openEditModal}
              onDelete={deleteScenario}
            />
          ))}
        </div>
      ) : null}

      <ScenarioFormModal
        open={modalOpen}
        mode={modalMode}
        isSubmitting={isSubmitting}
        values={formValues}
        fieldErrors={fieldErrors}
        scheduleErrors={scheduleErrors}
        submitError={submitError}
        onClose={closeModal}
        onSubmit={submit}
        onChangeField={updateField}
        onAddSchedule={addSchedule}
        onRemoveSchedule={removeSchedule}
        onChangeScheduleField={updateScheduleField}
      />
    </section>
  );
}
