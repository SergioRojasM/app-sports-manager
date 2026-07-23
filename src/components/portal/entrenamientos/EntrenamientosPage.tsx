'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEntrenamientos } from '@/hooks/portal/entrenamientos/useEntrenamientos';
import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import { usePublicarEntrenamiento } from '@/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento';
import { entrenamientosPublicosService } from '@/services/supabase/portal/entrenamientos-publicos.service';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';
import { EntrenamientoFormModal } from './EntrenamientoFormModal';
import { EntrenamientoDetalleModal } from './EntrenamientoDetalleModal';
import { EntrenamientoScopeModal } from './EntrenamientoScopeModal';
import { EntrenamientoActionModal } from './EntrenamientoActionModal';
import { PublicarEntrenamientoModal } from './PublicarEntrenamientoModal';
import { EntrenamientosCalendar } from './EntrenamientosCalendar';
import { EntrenamientosList } from './EntrenamientosList';
import { ReservasPanel } from './reservas';

type EntrenamientosPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando entrenamientos...
    </div>
  );
}

function toDateKeyInBogota(value: string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function toSelectedDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'full',
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

export function EntrenamientosPage({ tenantId }: EntrenamientosPageProps) {
  const currentTimestamp = new Date().getTime();
  const { role } = useTenantAccess(tenantId);
  const canManage = role === 'administrador' || role === 'entrenador';
  const isAdmin = role === 'administrador';
  const [reservasPanelOpen, setReservasPanelOpen] = useState(false);
  const [reservasPanelInstance, setReservasPanelInstance] = useState<TrainingInstance | null>(null);
  const publicarEntrenamiento = usePublicarEntrenamiento({ tenantId });

  const {
    loading,
    error,
    submitError,
    successMessage,
    isSubmitting,
    instances,
    calendarItems,
    disciplinas,
    escenarios,
    entrenadores,
    monthLabel,
    monthStartDate,
    formOpen,
    formMode,
    isEditingSingleInstance,
    isUniqueTypeLocked,
    scopeOpen,
    scopeAllowed,
    scopeAction,
    formValues,
    fieldErrors,
    ruleErrors,
    goToNextMonth,
    goToPreviousMonth,
    refresh,
    openCreateModal,
    requestEditInstance,
    requestDeleteInstance,
    closeFormModal,
    closeScopeModal,
    confirmScope,
    submitForm,
    updateField,
    addRule,
    removeRule,
    updateRuleField,
    // Categories
    categoriasForm,
    disciplinaHasNiveles,
    activeNiveles,
    categoriasError,
    totalAsignado,
    cuposSinCategoria,
    sumExceedsMax,
    toggleCategorias,
    updateCategoriasCupos,
    // Restrictions
    servicios,
    restricciones,
    reservaAntelacionHoras,
    cancelacionAntelacionHoras,
    addRestriccion,
    duplicateRestriccion,
    removeRestriccion,
    updateRestriccion,
    setReservaAntelacionHoras,
    setCancelacionAntelacionHoras,
    // Formulario
    formulariosPlantillas,
    formularioForm,
    setFormularioTipo,
    setFormularioPlantillaId,
    setFormularioObligatorio,
    plantillas,
    plantillasLoading,
    plantillasError,
    isPlantillasListModalOpen,
    openPlantillasListModal,
    closePlantillasListModal,
    isGuardarPlantillaModalOpen,
    openGuardarPlantillaModal,
    closeGuardarPlantillaModal,
    isSavingPlantilla,
    guardarPlantillaError,
    guardarPlantilla,
    aplicarPlantilla,
    eliminarPlantilla,
    onOpenGuardarPlantillaModalFromView,
    viewTarget,
    isViewModalOpen,
    viewLoading,
    requestViewInstance,
    closeViewModal,
    publishedEntrenamientoIds,
  } = useEntrenamientos({ tenantId });

  const instanceMap = useMemo(() => new Map(instances.map((instance) => [instance.id, instance])), [instances]);
  const [selectedInstanceForAction, setSelectedInstanceForAction] = useState<TrainingInstance | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!selectedDateKey) {
      return calendarItems;
    }

    return calendarItems.filter((item) => {
      if (!item.instance.fecha_hora) {
        return false;
      }
      return toDateKeyInBogota(item.instance.fecha_hora) === selectedDateKey;
    });
  }, [calendarItems, selectedDateKey]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) {
      return null;
    }
    return toSelectedDateLabel(selectedDateKey);
  }, [selectedDateKey]);

  const disciplineNameById = useMemo(() => {
    return disciplinas.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.id] = item.label;
      return accumulator;
    }, {});
  }, [disciplinas]);

  const scenarioNameById = useMemo(() => {
    return escenarios.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.id] = item.label;
      return accumulator;
    }, {});
  }, [escenarios]);

  const entrenadorNameById = useMemo(() => {
    return entrenadores.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.id] = item.label;
      return accumulator;
    }, {});
  }, [entrenadores]);

  const servicioNameById = useMemo(() => {
    return servicios.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.id] = item.label;
      return accumulator;
    }, {});
  }, [servicios]);

  const selectedActionContext = useMemo(() => {
    if (!selectedInstanceForAction) {
      return {
        canEdit: false,
        canDelete: false,
        editDisabledReason: 'No hay entrenamiento seleccionado.',
        deleteDisabledReason: 'No hay entrenamiento seleccionado.',
      };
    }

    const isHistorical = selectedInstanceForAction.fecha_hora
      ? new Date(selectedInstanceForAction.fecha_hora).getTime() < currentTimestamp
      : false;

    return {
      canEdit: !isHistorical,
      canDelete: !isHistorical,
      editDisabledReason: isHistorical
          ? 'No se pueden editar entrenamientos pasados.'
          : undefined,
      deleteDisabledReason: isHistorical ? 'No se pueden eliminar entrenamientos pasados.' : undefined,
    };
  }, [currentTimestamp, selectedInstanceForAction]);

  // Pre-publish validation (US-0089): a training with a servicio-based restriction
  // can never be published, since a cross-tenant visitor can never hold a
  // subscription/service in a tenant they don't belong to. Checked on-demand only for
  // the currently selected training, not eagerly for the whole list.
  const [servicioRestrictionById, setServicioRestrictionById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedInstanceForAction) {
      return;
    }

    let cancelled = false;
    const trainingId = selectedInstanceForAction.id;

    entrenamientosPublicosService
      .hasServicioRestrictions(tenantId, trainingId)
      .then((result) => {
        if (!cancelled) setServicioRestrictionById((prev) => ({ ...prev, [trainingId]: result }));
      })
      .catch(() => {
        if (!cancelled) setServicioRestrictionById((prev) => ({ ...prev, [trainingId]: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, selectedInstanceForAction]);

  const hasServicioRestriction = selectedInstanceForAction
    ? (servicioRestrictionById[selectedInstanceForAction.id] ?? null)
    : null;

  const isSelectedInstancePublished = selectedInstanceForAction
    ? publishedEntrenamientoIds.has(selectedInstanceForAction.id)
    : false;

  const publishActionContext = useMemo(() => {
    if (!selectedInstanceForAction) {
      return { canPublish: false, publishDisabledReason: 'No hay entrenamiento seleccionado.' };
    }

    if (!selectedActionContext.canEdit) {
      return { canPublish: false, publishDisabledReason: 'No se pueden publicar entrenamientos pasados.' };
    }

    if (hasServicioRestriction === null) {
      return { canPublish: false, publishDisabledReason: undefined };
    }

    if (hasServicioRestriction) {
      return {
        canPublish: false,
        publishDisabledReason:
          'Este entrenamiento tiene restricciones de servicios y no puede publicarse. Elimina las restricciones de servicio del entrenamiento para poder publicarlo.',
      };
    }

    return { canPublish: true, publishDisabledReason: undefined };
  }, [hasServicioRestriction, selectedActionContext.canEdit, selectedInstanceForAction]);

  const openActionModal = (trainingId: string) => {
    const target = instanceMap.get(trainingId);
    if (!target) {
      return;
    }
    setSelectedInstanceForAction(target);
  };

  const closeActionModal = () => {
    setSelectedInstanceForAction(null);
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDateKey((current) => (current === dateKey ? null : dateKey));
  };

  const handleGoToPreviousMonth = () => {
    setSelectedDateKey(null);
    goToPreviousMonth();
  };

  const handleGoToNextMonth = () => {
    setSelectedDateKey(null);
    goToNextMonth();
  };

  const openReservasPanel = (instance: TrainingInstance) => {
    setReservasPanelInstance(instance);
    setReservasPanelOpen(true);
    closeActionModal();
  };

  const openPublicarModal = (instance: TrainingInstance) => {
    void publicarEntrenamiento.open(instance);
    closeActionModal();
  };

  const closeReservasPanel = () => {
    setReservasPanelOpen(false);
    setReservasPanelInstance(null);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">Gestión de Entrenamientos</h1>
          <p className="mt-2 text-sm text-slate-400">
            Administra entrenamientos por serie, con reglas recurrentes y excepciones por instancia.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep"
          >
            Crear entrenamiento
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
          </button>
        )}
      </header>

      {successMessage ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      {submitError && !formOpen ? (
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

      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:items-stretch">
          <div className="xl:col-span-2 xl:min-h-0">
            <EntrenamientosCalendar
              monthLabel={monthLabel}
              monthStartDate={monthStartDate}
              items={calendarItems}
              disciplinas={disciplinas}
              selectedDateKey={selectedDateKey}
              canManage={canManage}
              onPreviousMonth={handleGoToPreviousMonth}
              onNextMonth={handleGoToNextMonth}
              onSelectDate={handleSelectDate}
            />
          </div>

          <div className="xl:col-span-1 xl:min-h-0 xl:self-start">
            <EntrenamientosList
              items={filteredItems}
              selectedDateLabel={selectedDateLabel}
              disciplineNameById={disciplineNameById}
              scenarioNameById={scenarioNameById}
              canManage={canManage}
              onOpenActions={openActionModal}
              onClearDateFilter={() => setSelectedDateKey(null)}
            />
          </div>
        </div>
      ) : null}

      <EntrenamientoActionModal
        open={Boolean(selectedInstanceForAction)}
        trainingName={selectedInstanceForAction?.nombre ?? ''}
        canManage={canManage}
        canEdit={canManage && selectedActionContext.canEdit}
        canDelete={canManage && selectedActionContext.canDelete}
        editDisabledReason={selectedActionContext.editDisabledReason}
        deleteDisabledReason={selectedActionContext.deleteDisabledReason}
        isAdmin={isAdmin}
        isPublished={isSelectedInstancePublished}
        canPublish={publishActionContext.canPublish}
        publishDisabledReason={publishActionContext.publishDisabledReason}
        onPublicar={() => {
          if (!selectedInstanceForAction) return;
          openPublicarModal(selectedInstanceForAction);
        }}
        onClose={closeActionModal}
        onViewDetail={() => {
          if (!selectedInstanceForAction) {
            return;
          }
          requestViewInstance(selectedInstanceForAction);
          closeActionModal();
        }}
        onEdit={() => {
          if (!selectedInstanceForAction || !selectedActionContext.canEdit) {
            return;
          }
          requestEditInstance(selectedInstanceForAction);
          closeActionModal();
        }}
        onDelete={() => {
          if (!selectedInstanceForAction || !selectedActionContext.canDelete) {
            return;
          }
          requestDeleteInstance(selectedInstanceForAction);
          closeActionModal();
        }}
        onViewReservas={
          selectedInstanceForAction
            ? () => openReservasPanel(selectedInstanceForAction)
            : undefined
        }
      />

      <ReservasPanel
        open={reservasPanelOpen}
        tenantId={tenantId}
        instance={reservasPanelInstance}
        role={role}
        onClose={closeReservasPanel}
        onMutationComplete={() => void refresh()}
      />

      <PublicarEntrenamientoModal
        open={publicarEntrenamiento.isOpen}
        isPublished={publicarEntrenamiento.isPublished}
        isLoading={publicarEntrenamiento.isLoading}
        training={publicarEntrenamiento.training}
        disciplinaNombre={
          publicarEntrenamiento.training ? (disciplineNameById[publicarEntrenamiento.training.disciplina_id] ?? 'Disciplina') : ''
        }
        escenarioNombre={
          publicarEntrenamiento.training ? (scenarioNameById[publicarEntrenamiento.training.escenario_id] ?? 'Escenario') : ''
        }
        values={publicarEntrenamiento.values}
        existingBannerUrl={publicarEntrenamiento.existingBannerUrl}
        bannerPreviewUrl={publicarEntrenamiento.bannerPreviewUrl}
        bannerError={publicarEntrenamiento.bannerError}
        isSubmitting={publicarEntrenamiento.isSubmitting}
        submitError={publicarEntrenamiento.submitError}
        onChangeField={publicarEntrenamiento.updateField}
        onBannerFileSelect={publicarEntrenamiento.handleBannerFileSelect}
        onClose={publicarEntrenamiento.close}
        onSubmit={async () => {
          const success = await publicarEntrenamiento.submit();
          if (success) void refresh();
          return success;
        }}
        onDespublicar={async () => {
          const success = await publicarEntrenamiento.despublicar();
          if (success) void refresh();
          return success;
        }}
      />

      <EntrenamientoFormModal
        open={formOpen}
        mode={formMode}
        isEditingSingleInstance={isEditingSingleInstance}
        isUniqueTypeLocked={isUniqueTypeLocked}
        isSubmitting={isSubmitting}
        values={formValues}
        fieldErrors={fieldErrors}
        ruleErrors={ruleErrors}
        submitError={submitError}
        disciplinas={disciplinas}
        escenarios={escenarios}
        entrenadores={entrenadores}
        onClose={closeFormModal}
        onSubmit={submitForm}
        onChangeField={updateField}
        onAddRule={addRule}
        onRemoveRule={removeRule}
        onChangeRuleField={updateRuleField}
        disciplinaHasNiveles={disciplinaHasNiveles}
        categoriasForm={categoriasForm}
        activeNiveles={activeNiveles}
        totalAsignado={totalAsignado}
        cuposSinCategoria={cuposSinCategoria}
        sumExceedsMax={sumExceedsMax}
        categoriasError={categoriasError}
        onToggleCategorias={toggleCategorias}
        onUpdateCategoriasCupos={updateCategoriasCupos}
        servicios={servicios}
        restricciones={restricciones}
        reservaAntelacionHoras={reservaAntelacionHoras}
        cancelacionAntelacionHoras={cancelacionAntelacionHoras}
        onAddRestriccion={addRestriccion}
        onDuplicateRestriccion={duplicateRestriccion}
        onRemoveRestriccion={removeRestriccion}
        onUpdateRestriccion={updateRestriccion}
        onSetReservaAntelacion={setReservaAntelacionHoras}
        onSetCancelacionAntelacion={setCancelacionAntelacionHoras}
        tenantId={tenantId}
        role={role}
        formularioForm={formularioForm}
        formulariosPlantillas={formulariosPlantillas}
        onChangeFormularioTipo={setFormularioTipo}
        onChangeFormularioPlantillaId={setFormularioPlantillaId}
        onChangeFormularioObligatorio={setFormularioObligatorio}
        plantillas={plantillas}
        plantillasLoading={plantillasLoading}
        plantillasError={plantillasError}
        isPlantillasListModalOpen={isPlantillasListModalOpen}
        onOpenPlantillasListModal={openPlantillasListModal}
        onClosePlantillasListModal={closePlantillasListModal}
        isGuardarPlantillaModalOpen={isGuardarPlantillaModalOpen}
        onOpenGuardarPlantillaModal={openGuardarPlantillaModal}
        onCloseGuardarPlantillaModal={closeGuardarPlantillaModal}
        isSavingPlantilla={isSavingPlantilla}
        guardarPlantillaError={guardarPlantillaError}
        onGuardarPlantilla={guardarPlantilla}
        onAplicarPlantilla={aplicarPlantilla}
        onEliminarPlantilla={eliminarPlantilla}
      />

      <EntrenamientoDetalleModal
        open={isViewModalOpen}
        viewTarget={viewTarget}
        viewLoading={viewLoading}
        canManage={canManage}
        disciplineNameById={disciplineNameById}
        scenarioNameById={scenarioNameById}
        entrenadorNameById={entrenadorNameById}
        servicioNameById={servicioNameById}
        onClose={closeViewModal}
        isGuardarPlantillaModalOpen={isGuardarPlantillaModalOpen}
        isSavingPlantilla={isSavingPlantilla}
        guardarPlantillaError={guardarPlantillaError}
        onOpenGuardarPlantillaModal={onOpenGuardarPlantillaModalFromView}
        onCloseGuardarPlantillaModal={closeGuardarPlantillaModal}
        onGuardarPlantilla={guardarPlantilla}
      />

      <EntrenamientoScopeModal
        open={scopeOpen}
        action={scopeAction}
        allowedScopes={scopeAllowed}
        onClose={closeScopeModal}
        onConfirm={(selectedScope) => {
          void confirmScope(selectedScope);
        }}
      />
    </section>
  );
}
