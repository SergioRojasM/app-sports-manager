'use client';

import {
  GritAddTile,
  GritAlert,
  GritButton,
  GritConfirmDialog,
  GritEmptyState,
  GritPageHeader,
  GritSearchField,
} from '@/components/ui';
import { useScenarios } from '@/hooks/portal/scenarios/useScenarios';
import { ScenarioCard } from './ScenarioCard';
import { ScenarioFormModal } from './ScenarioFormModal';
import { ScenariosHeaderFilters } from './ScenariosHeaderFilters';

type ScenariosPageProps = {
  tenantId: string;
};

/** Scenarios management (`qG0T5` Admin · Escenarios). */
export function ScenariosPage({ tenantId }: ScenariosPageProps) {
  const {
    scenarios,
    loading,
    error,
    filteredScenarios,
    searchTerm,
    setSearchTerm,
    tipoFilter,
    setTipoFilter,
    tipoOptions,
    summary,
    modalOpen,
    modalMode,
    formValues,
    fieldErrors,
    scheduleErrors,
    submitError,
    successMessage,
    dismissSuccess,
    isSubmitting,
    openCreateModal,
    openEditModal,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete,
    cancelDelete,
    confirmDelete,
    closeModal,
    updateField,
    addSchedule,
    removeSchedule,
    updateScheduleField,
    submit,
    refresh,
  } = useScenarios({ tenantId });

  const hasFilters = searchTerm.trim() !== '' || tipoFilter !== 'todos';

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Tus"
        titleAccent="escenarios."
        italic
        actions={
          <>
            <GritSearchField
              aria-label="Buscar por nombre o ubicación"
              placeholder="Buscar por nombre o ubicación…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full sm:w-[260px]"
            />
            <GritButton icon="add" onClick={openCreateModal}>
              Crear escenario
            </GritButton>
          </>
        }
      />

      {successMessage ? (
        <GritAlert tone="success" onDismiss={dismissSuccess}>
          {successMessage}
        </GritAlert>
      ) : null}

      {loading ? (
        <div role="status">
          <GritEmptyState icon="hourglass_empty" title="Cargando escenarios…" />
        </div>
      ) : error ? (
        <GritEmptyState
          icon="error"
          title="No pudimos cargar los escenarios"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Reintentar
            </GritButton>
          }
        />
      ) : scenarios.length === 0 ? (
        <GritEmptyState
          icon="stadium"
          title="Aún no tienes escenarios"
          description="Crea tu primer escenario para programar entrenamientos y eventos."
          action={
            <GritButton icon="add" onClick={openCreateModal}>
              Crear escenario
            </GritButton>
          }
        />
      ) : (
        <>
          <ScenariosHeaderFilters
            total={scenarios.length}
            tipoOptions={tipoOptions}
            tipoFilter={tipoFilter}
            onTipoChange={setTipoFilter}
            summary={summary}
          />
          {filteredScenarios.length === 0 && hasFilters ? (
            <GritEmptyState
              icon="search_off"
              title="Sin resultados"
              description="Ningún escenario coincide con la búsqueda o el filtro."
              action={
                <GritButton
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setTipoFilter('todos');
                  }}
                >
                  Limpiar filtros
                </GritButton>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredScenarios.map((scenario) => (
                <ScenarioCard key={scenario.id} scenario={scenario} onEdit={openEditModal} onDelete={requestDelete} />
              ))}
              <GritAddTile
                title="Agregar escenario"
                subtitle="Pista, piscina, parque o circuito"
                onClick={openCreateModal}
                className="min-h-[300px]"
              />
            </div>
          )}
        </>
      )}

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

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar escenario"
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
