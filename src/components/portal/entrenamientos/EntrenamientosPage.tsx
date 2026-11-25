'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GritAlert, GritButton, GritCard, GritEmptyState, GritPageHeader } from '@/components/ui';
import { useEntrenamientos } from '@/hooks/portal/entrenamientos/useEntrenamientos';
import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import type { EntrenamientosVista, TrainingCalendarItem, TrainingInstance } from '@/types/portal/entrenamientos.types';
import { esEntrenamientoFuturo } from '@/lib/portal/entrenamiento-evento.utils';
import {
  buildSemana,
  buildTonosPorDisciplina,
  calcularKpis,
  diaDeInstancia,
  hoyKey,
  isKeyInRange,
} from '@/lib/portal/entrenamientos-calendario';
import { EntrenamientoFormModal } from './EntrenamientoFormModal';
import { EntrenamientoDetalleModal } from './EntrenamientoDetalleModal';
import { EntrenamientoScopeModal } from './EntrenamientoScopeModal';
import { EntrenamientoActionModal } from './EntrenamientoActionModal';
import { EntrenamientosAgendaDia } from './EntrenamientosAgendaDia';
import { EntrenamientosCalendar } from './EntrenamientosCalendar';
import { EntrenamientosHeaderTools } from './EntrenamientosHeaderTools';
import { EntrenamientosKpis } from './EntrenamientosKpis';
import { EntrenamientosList } from './EntrenamientosList';
import { EntrenamientosPeriodoHeader, type LeyendaDisciplina } from './EntrenamientosPeriodoHeader';
import { EntrenamientosSemana } from './EntrenamientosSemana';
import { ReservasPanel } from './reservas';

type EntrenamientosPageProps = {
  tenantId: string;
};

const VISTAS: ReadonlyArray<EntrenamientosVista> = ['semana', 'mes', 'lista'];

function parseVista(value: string | null): EntrenamientosVista {
  return VISTAS.includes(value as EntrenamientosVista) ? (value as EntrenamientosVista) : 'semana';
}

function toLookup(options: Array<{ id: string; label: string }>): Record<string, string> {
  return options.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.id] = item.label;
    return accumulator;
  }, {});
}

/** Stable empty list: while a period loads, the views render no (stale) sessions. */
const SIN_ITEMS: TrainingCalendarItem[] = [];

const PUBLICAR_EN_EVENTOS_SOLO_FUTUROS = 'Solo los entrenamientos futuros se pueden publicar como evento.';

/** "Gestiona tus entrenamientos." (grit-arena-v3 `p5Ms22`, US-0142): week / month / list calendar with the day agenda. */
export function EntrenamientosPage({ tenantId }: EntrenamientosPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTimestamp = new Date().getTime();
  const { role } = useTenantAccess(tenantId);
  const canManage = role === 'administrador' || role === 'entrenador';
  const [reservasPanelOpen, setReservasPanelOpen] = useState(false);
  const [reservasPanelInstance, setReservasPanelInstance] = useState<TrainingInstance | null>(null);
  const [reservasPanelAutoReservar, setReservasPanelAutoReservar] = useState(false);
  const [listaDiaFiltro, setListaDiaFiltro] = useState<string | null>(null);
  const [dismissedSuccess, setDismissedSuccess] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

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
    calendar,
    instancesLoading,
    instancesError,
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
  } = useEntrenamientos({ tenantId, initialVista: parseVista(searchParams.get('vista')) });

  const { vista, periodo } = calendar;
  const todayKey = hoyKey(new Date(currentTimestamp));
  const busy = loading || instancesLoading;
  // The hook keeps the previous period's instances until the new ones arrive; don't show them.
  const periodItems = busy ? SIN_ITEMS : calendarItems;

  const instanceMap = useMemo(() => new Map(instances.map((instance) => [instance.id, instance])), [instances]);
  const [selectedInstanceForAction, setSelectedInstanceForAction] = useState<TrainingInstance | null>(null);

  const disciplineNameById = useMemo(() => toLookup(disciplinas), [disciplinas]);
  const scenarioNameById = useMemo(() => toLookup(escenarios), [escenarios]);
  const entrenadorNameById = useMemo(() => toLookup(entrenadores), [entrenadores]);
  const servicioNameById = useMemo(() => toLookup(servicios), [servicios]);
  const tonos = useMemo(() => buildTonosPorDisciplina(disciplinas), [disciplinas]);

  /** Sessions by Bogotá day, in start order (the service already orders by fecha_hora). */
  const itemsPorDia = useMemo(() => {
    const map = new Map<string, TrainingCalendarItem[]>();
    for (const item of periodItems) {
      const key = diaDeInstancia(item.instance);
      if (key) map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [periodItems]);

  // Mes loads the whole 42-cell grid; KPIs, legend and the default day only count the month itself.
  const monthPrefix = periodo.monthStartDate?.slice(0, 7) ?? null;
  const enPeriodo = (dateKey: string) =>
    monthPrefix ? dateKey.startsWith(monthPrefix) : isKeyInRange(dateKey, periodo.from, periodo.to);

  const monthStartDate = periodo.monthStartDate;
  const itemsDelPeriodo = useMemo(() => {
    if (!monthStartDate) return periodItems;
    const prefix = monthStartDate.slice(0, 7);
    return periodItems.filter((item) => diaDeInstancia(item.instance)?.startsWith(prefix));
  }, [periodItems, monthStartDate]);

  const kpis = useMemo(() => calcularKpis(itemsDelPeriodo.map((item) => item.instance)), [itemsDelPeriodo]);

  const leyenda = useMemo<LeyendaDisciplina[]>(() => {
    const ids = new Set(itemsDelPeriodo.map((item) => item.instance.disciplina_id));
    return Array.from(ids)
      .map((id) => ({ id, nombre: disciplineNameById[id] ?? 'Sin disciplina', tono: tonos[id] ?? 'accent' }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [disciplineNameById, itemsDelPeriodo, tonos]);

  // Agenda day: the chosen one while it is in the period; else today, the first day with sessions, or the period start.
  const isCurrentPeriod = enPeriodo(todayKey);
  const primerDiaConSesiones = Array.from(itemsPorDia.keys()).filter(enPeriodo).sort()[0];
  const selectedDateKey =
    calendar.selectedDateKey && enPeriodo(calendar.selectedDateKey)
      ? calendar.selectedDateKey
      : isCurrentPeriod
        ? todayKey
        : (primerDiaConSesiones ?? periodo.monthStartDate ?? periodo.from);

  const dias = useMemo(() => buildSemana(periodo.from, todayKey), [periodo.from, todayKey]);

  const changeVista = (next: EntrenamientosVista, anchorDay: string = selectedDateKey) => {
    calendar.setVista(next, anchorDay);
    if (next !== 'lista') setListaDiaFiltro(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('vista', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleVistaChange = (next: EntrenamientosVista) => {
    setListaDiaFiltro(null);
    changeVista(next);
  };

  const handleVerDetalleDia = (dateKey: string) => {
    changeVista('lista', dateKey);
    setListaDiaFiltro(dateKey);
  };

  const navigate = (action: () => void) => {
    setListaDiaFiltro(null);
    action();
  };

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
      editDisabledReason: isHistorical ? 'No se pueden editar entrenamientos pasados.' : undefined,
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

  const openReservasPanel = (instance: TrainingInstance) => {
    setReservasPanelInstance(instance);
    setReservasPanelAutoReservar(false);
    setReservasPanelOpen(true);
    closeActionModal();
  };

  // "Reservar" (US-0127): open the panel and let it open the booking dialog once loaded
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

  const showSuccess = successMessage && successMessage !== dismissedSuccess;
  const showSubmitError = submitError && !formOpen && submitError !== dismissedError;

  const periodoHeader = (
    <EntrenamientosPeriodoHeader
      vista={vista}
      label={periodo.label}
      isCurrentPeriod={isCurrentPeriod}
      leyenda={leyenda}
      onPrevious={() => navigate(calendar.goPrevious)}
      onNext={() => navigate(calendar.goNext)}
      onToday={() => navigate(calendar.goToday)}
    />
  );

  const instancesErrorAlert = instancesError ? (
    <GritAlert
      tone="danger"
      action={
        <GritButton variant="secondary" size="sm" icon="refresh" onClick={() => void refresh()}>
          Reintentar
        </GritButton>
      }
    >
      {instancesError}
    </GritAlert>
  ) : null;

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title={canManage ? 'Gestiona tus' : 'Calendario de'}
        titleAccent="entrenamientos."
        actions={
          <EntrenamientosHeaderTools vista={vista} onVistaChange={handleVistaChange} canManage={canManage} onCrear={openCreateModal} />
        }
      />

      {showSuccess ? (
        <GritAlert tone="success" onDismiss={() => setDismissedSuccess(successMessage)}>
          {successMessage}
        </GritAlert>
      ) : null}

      {showSubmitError ? (
        <GritAlert tone="danger" onDismiss={() => setDismissedError(submitError)}>
          {submitError}
        </GritAlert>
      ) : null}

      {!loading && error ? (
        <GritEmptyState
          icon="error"
          title="No pudimos cargar los entrenamientos"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Reintentar
            </GritButton>
          }
        />
      ) : (
        <>
          <EntrenamientosKpis kpis={kpis} vista={vista} loading={busy} />

          {vista === 'lista' ? (
            <GritCard variant="card" padding="none" className="flex min-w-0 flex-col gap-4 px-3 py-4 sm:px-5 sm:py-5">
              {periodoHeader}
              {instancesErrorAlert ?? (
                <EntrenamientosList
                  key={`${periodo.from}-${listaDiaFiltro ?? 'semana'}`}
                  items={periodItems}
                  dayFilterKey={listaDiaFiltro}
                  onClearDayFilter={() => setListaDiaFiltro(null)}
                  tonos={tonos}
                  disciplineNameById={disciplineNameById}
                  scenarioNameById={scenarioNameById}
                  entrenadorNameById={entrenadorNameById}
                  todayKey={todayKey}
                  now={currentTimestamp}
                  loading={busy}
                  canManage={canManage}
                  onOpenTraining={openActionModal}
                  onReservar={openReservaDirecta}
                />
              )}
            </GritCard>
          ) : (
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <GritCard variant="card" padding="none" className="flex min-w-0 flex-col gap-4 px-3 py-4 sm:px-5 sm:py-5">
                {periodoHeader}
                {instancesErrorAlert ??
                  (vista === 'semana' ? (
                    <EntrenamientosSemana
                      key={periodo.from}
                      dias={dias}
                      items={periodItems}
                      tonos={tonos}
                      selectedDateKey={selectedDateKey}
                      now={currentTimestamp}
                      loading={busy}
                      canManage={canManage}
                      onSelectDate={calendar.selectDate}
                      onOpenTraining={openActionModal}
                      onCrear={openCreateModal}
                    />
                  ) : (
                    <EntrenamientosCalendar
                      monthStartDate={periodo.monthStartDate ?? periodo.from}
                      items={periodItems}
                      tonos={tonos}
                      selectedDateKey={selectedDateKey}
                      todayKey={todayKey}
                      loading={busy}
                      onSelectDate={calendar.selectDate}
                      onOpenTraining={openActionModal}
                    />
                  ))}
              </GritCard>

              <EntrenamientosAgendaDia
                dateKey={selectedDateKey}
                isToday={selectedDateKey === todayKey}
                items={itemsPorDia.get(selectedDateKey) ?? []}
                tonos={tonos}
                scenarioNameById={scenarioNameById}
                entrenadorNameById={entrenadorNameById}
                now={currentTimestamp}
                loading={busy}
                canManage={canManage}
                onOpenTraining={openActionModal}
                onReservar={openReservaDirecta}
                onCrear={openCreateModal}
                onVerDetalleDia={handleVerDetalleDia}
              />
            </div>
          )}
        </>
      )}

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
        onViewReservas={selectedInstanceForAction ? () => openReservasPanel(selectedInstanceForAction) : undefined}
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
