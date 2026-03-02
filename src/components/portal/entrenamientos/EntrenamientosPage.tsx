'use client';

import { useMemo } from 'react';
import { useEntrenamientos } from '@/hooks/portal/entrenamientos/useEntrenamientos';
import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import { useState } from 'react';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';
import { EntrenamientoFormModal } from './EntrenamientoFormModal';
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
  const [reservasPanelOpen, setReservasPanelOpen] = useState(false);
  const [reservasPanelInstance, setReservasPanelInstance] = useState<TrainingInstance | null>(null);

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
              onPreviousMonth={handleGoToPreviousMonth}
              onNextMonth={handleGoToNextMonth}
              onOpenActions={openActionModal}
              onSelectDate={handleSelectDate}
            />
          </div>

          <div className="xl:col-span-1 xl:min-h-0 xl:self-start">
            <EntrenamientosList
              items={filteredItems}
              selectedDateLabel={selectedDateLabel}
              disciplineNameById={disciplineNameById}
              scenarioNameById={scenarioNameById}
              onOpenActions={openActionModal}
              onClearDateFilter={() => setSelectedDateKey(null)}
            />
          </div>
        </div>
      ) : null}

      <EntrenamientoActionModal
        open={Boolean(selectedInstanceForAction)}
        trainingName={selectedInstanceForAction?.nombre ?? ''}
        canEdit={selectedActionContext.canEdit}
        canDelete={selectedActionContext.canDelete}
        editDisabledReason={selectedActionContext.editDisabledReason}
        deleteDisabledReason={selectedActionContext.deleteDisabledReason}
        onClose={closeActionModal}
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
