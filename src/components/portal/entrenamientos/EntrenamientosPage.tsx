'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEntrenamientos } from '@/hooks/portal/entrenamientos/useEntrenamientos';
import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';
import { esEntrenamientoFuturo } from '@/lib/portal/entrenamiento-evento.utils';
import { EntrenamientoFormModal } from './EntrenamientoFormModal';
import { EntrenamientoDetalleModal } from './EntrenamientoDetalleModal';
import { EntrenamientoScopeModal } from './EntrenamientoScopeModal';
import { EntrenamientoActionModal } from './EntrenamientoActionModal';
import { EntrenamientosCalendar } from './EntrenamientosCalendar';
import { EntrenamientosList } from './EntrenamientosList';
import { ReservasPanel } from './reservas';

type EntrenamientosPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
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

const PUBLICAR_EN_EVENTOS_SOLO_FUTUROS = 'Solo los entrenamientos futuros se pueden publicar como evento.';

export function EntrenamientosPage({ tenantId }: EntrenamientosPageProps) {
  const router = useRouter();
  const currentTimestamp = new Date().getTime();
  const { role } = useTenantAccess(tenantId);
  const canManage = role === 'administrador' || role === 'entrenador';
  const [reservasPanelOpen, setReservasPanelOpen] = useState(false);
  const [reservasPanelInstance, setReservasPanelInstance] = useState<TrainingInstance | null>(null);
  const [reservasPanelAutoReservar, setReservasPanelAutoReservar] = useState(false);

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
        canPublicarEnEventos: false,
        editDisabledReason: 'No hay entrenamiento seleccionado.',
        deleteDisabledReason: 'No hay entrenamiento seleccionado.',
        publicarEnEventosDisabledReason: 'No hay entrenamiento seleccionado.',
      };
    }

    const isHistorical = selectedInstanceForAction.fecha_hora
      ? new Date(selectedInstanceForAction.fecha_hora).getTime() < currentTimestamp
      : false;

    const canPublicarEnEventos = esEntrenamientoFuturo(selectedInstanceForAction.fecha_hora, currentTimestamp);

    return {
      canEdit: !isHistorical,
      canDelete: !isHistorical,
      canPublicarEnEventos,
      publicarEnEventosDisabledReason: canPublicarEnEventos ? undefined : PUBLICAR_EN_EVENTOS_SOLO_FUTUROS,
      editDisabledReason: isHistorical
          ? 'No se pueden editar entrenamientos pasados.'
          : undefined,
      deleteDisabledReason: isHistorical ? 'No se pueden eliminar entrenamientos pasados.' : undefined,
    };
  }, [currentTimestamp, selectedInstanceForAction]);

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

  // US-0132: the event wizard pre-fills a new, unsaved event from this occurrence
  const publicarEnEventos = () => {
    const target = selectedInstanceForAction;
    if (!target || !esEntrenamientoFuturo(target.fecha_hora, Date.now())) {
      return;
    }
    closeActionModal();
    router.push(`/portal/orgs/${tenantId}/gestion-eventos/nuevo?desdeEntrenamiento=${target.id}`);
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
    setReservasPanelAutoReservar(false);
    setReservasPanelOpen(true);
    closeActionModal();
  };

  // Card "Reservar" (US-0127): open the panel and let it open the booking dialog once loaded
  const openReservaDirecta = (trainingId: string) => {
    const target = instanceMap.get(trainingId);
    if (!target) {
      return;
    }
    setReservasPanelInstance(target);
    setReservasPanelAutoReservar(true);
    setReservasPanelOpen(true);
  };

  const closeReservasPanel = () => {
    setReservasPanelOpen(false);
    setReservasPanelInstance(null);
    setReservasPanelAutoReservar(false);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]">Gestión de Entrenamientos</h1>
          <p className="mt-2 text-sm text-grit-subtext">
            Administra entrenamientos por serie, con reglas recurrentes y excepciones por instancia.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg"
          >
            Crear entrenamiento
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
          </button>
        )}
      </header>

      {successMessage ? (
        <div className="rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      {submitError && !formOpen ? (
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
              onReservar={openReservaDirecta}
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
        onPublicarEnEventos={role === 'administrador' ? publicarEnEventos : undefined}
        canPublicarEnEventos={selectedActionContext.canPublicarEnEventos}
        publicarEnEventosDisabledReason={selectedActionContext.publicarEnEventosDisabledReason}
      />

      <ReservasPanel
        open={reservasPanelOpen}
        tenantId={tenantId}
        instance={reservasPanelInstance}
        role={role}
        autoReservar={reservasPanelAutoReservar}
        onClose={closeReservasPanel}
        onMutationComplete={() => void refresh()}
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
        tenantId={tenantId}
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
