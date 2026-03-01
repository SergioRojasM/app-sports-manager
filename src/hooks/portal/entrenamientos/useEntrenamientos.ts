'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { entrenamientosService } from '@/services/supabase/portal/entrenamientos.service';
import { useEntrenamientoForm } from './useEntrenamientoForm';
import { useEntrenamientoScope } from './useEntrenamientoScope';
import { useEntrenamientosCalendar } from './useEntrenamientosCalendar';
import {
  TrainingServiceError,
  type SelectOption,
  type TrainingCalendarItem,
  type TrainingGroupRule,
  type TrainingGroupWithDetails,
  type TrainingInstance,
  type TrainingScope,
  type TrainingWizardValues,
} from '@/types/portal/entrenamientos.types';

type UseEntrenamientosOptions = {
  tenantId: string;
};

type EditTarget = {
  source: 'group' | 'instance';
  scope: TrainingScope;
  trainingGroupId?: string;
  trainingId?: string;
  effectiveFrom?: string;
};

type UseEntrenamientosResult = {
  loading: boolean;
  error: string | null;
  submitError: string | null;
  successMessage: string | null;
  isSubmitting: boolean;
  groups: TrainingGroupWithDetails[];
  instances: TrainingInstance[];
  calendarItems: TrainingCalendarItem[];
  disciplinas: SelectOption[];
  escenarios: SelectOption[];
  entrenadores: SelectOption[];
  monthLabel: string;
  monthStartDate: string;
  formOpen: boolean;
  formMode: 'create' | 'edit';
  isEditingSingleInstance: boolean;
  isUniqueTypeLocked: boolean;
  scopeOpen: boolean;
  scopeAllowed: TrainingScope[];
  scopeAction: 'edit' | 'delete' | null;
  formValues: ReturnType<typeof useEntrenamientoForm>['formValues'];
  fieldErrors: ReturnType<typeof useEntrenamientoForm>['fieldErrors'];
  ruleErrors: ReturnType<typeof useEntrenamientoForm>['ruleErrors'];
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  refresh: () => Promise<void>;
  openCreateModal: () => void;
  requestEditGroup: (group: TrainingGroupWithDetails) => void;
  requestEditInstance: (instance: TrainingInstance) => void;
  requestDeleteGroup: (group: TrainingGroupWithDetails) => void;
  requestDeleteInstance: (instance: TrainingInstance) => void;
  closeFormModal: () => void;
  closeScopeModal: () => void;
  confirmScope: (scope: TrainingScope) => Promise<void>;
  submitForm: () => Promise<boolean>;
  updateField: (field: keyof TrainingWizardValues, value: string) => void;
  addRule: () => void;
  removeRule: (index: number) => void;
  updateRuleField: (index: number, field: 'tipo_bloque' | 'hora_inicio' | 'hora_fin' | 'horas_especificas', value: string | string[]) => void;
};

const EMPTY_SUCCESS: string | null = null;

function mapServiceErrorToMessage(error: unknown, fallback: string): string {
  if (error instanceof TrainingServiceError) {
    return error.message;
  }
  return fallback;
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePositiveInt(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toDateOnlyFromIso(dateTimeValue: string): string {
  const date = new Date(dateTimeValue);
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

function toDateTimeLocalInBogota(dateTimeValue: string): string {
  const date = new Date(dateTimeValue);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toBogotaIsoFromLocalInput(localDateTimeValue: string): string {
  const trimmed = localDateTimeValue.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00-05:00`;
  }

  return new Date(trimmed).toISOString();
}

function isHistoricalTraining(instance: TrainingInstance): boolean {
  if (!instance.fecha_hora) {
    return false;
  }

  return new Date(instance.fecha_hora).getTime() < Date.now();
}

function toRuleForm(rule: TrainingGroupRule) {
  return {
    tipo_bloque: rule.tipo_bloque,
    hora_inicio: rule.hora_inicio ?? '',
    hora_fin: rule.hora_fin ?? '',
    horas_especificas: rule.horas_especificas ?? [],
  };
}

function getRecurringDefaultsFromRules(rules: TrainingGroupRule[]) {
  if (rules.length === 0) {
    return {
      dias_semana: [],
      repetir_cada_semanas: '1',
    };
  }

  return {
    dias_semana: (rules[0].dias_semana ?? []).map((value) => String(value)),
    repetir_cada_semanas: String(rules[0].repetir_cada_semanas ?? 1),
  };
}
function toTrainingCalendarItem(instance: TrainingInstance, groupsById: Map<string, TrainingGroupWithDetails>): TrainingCalendarItem {
  const group = instance.entrenamiento_grupo_id ? groupsById.get(instance.entrenamiento_grupo_id) : undefined;
  const date = instance.fecha_hora ? new Date(instance.fecha_hora) : null;

  return {
    instance,
    groupName: group?.nombre ?? 'Sin serie',
    startsAtLabel: date
      ? new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date)
      : 'Sin fecha definida',
    durationLabel: instance.duracion_minutos ? `${instance.duracion_minutos} min` : 'Duración por definir',
  };
}

function toCreatePayload(tenantId: string, values: TrainingWizardValues) {
  const duration = parsePositiveInt(values.duracion_minutos);
  const capacity = parsePositiveInt(values.cupo_maximo);

  if (values.tipo === 'unico') {
    const uniqueDateTime = toBogotaIsoFromLocalInput(values.fecha_hora_unico);
    const uniqueDate = toDateOnlyFromIso(uniqueDateTime);

    return {
      tenantId,
      group: {
        tipo: 'unico' as const,
        nombre: values.nombre.trim() || 'Entrenamiento único',
        descripcion: toNullable(values.descripcion),
        disciplina_id: values.disciplina_id,
        escenario_id: values.escenario_id,
        entrenador_id: toNullable(values.entrenador_id),
        duracion_minutos: duration,
        cupo_maximo: capacity,
        fecha_inicio: uniqueDate,
        fecha_fin: null,
      },
      rules: [],
      uniqueDateTime,
    };
  }

  const rules = values.reglas
    .filter((rule) => {
      if (rule.tipo_bloque === 'una_vez_dia') {
        return rule.hora_inicio.trim().length > 0;
      }
      if (rule.tipo_bloque === 'franja_repeticion') {
        return rule.hora_inicio.trim().length > 0 || rule.hora_fin.trim().length > 0;
      }
      return rule.horas_especificas.length > 0;
    })
    .map((rule) => ({
      dias_semana: values.dias_semana.map((value) => Number(value)),
      repetir_cada_semanas: Number(values.repetir_cada_semanas || '1'),
      tipo_bloque: rule.tipo_bloque,
      hora_inicio: rule.tipo_bloque === 'horas_especificas' ? null : rule.hora_inicio,
      hora_fin: rule.tipo_bloque === 'franja_repeticion' ? rule.hora_fin : null,
      horas_especificas: rule.tipo_bloque === 'horas_especificas' ? rule.horas_especificas : null,
    }));

  return {
    tenantId,
    group: {
      tipo: 'recurrente' as const,
      nombre: values.nombre.trim() || 'Serie de entrenamiento',
      descripcion: toNullable(values.descripcion),
      disciplina_id: values.disciplina_id,
      escenario_id: values.escenario_id,
      entrenador_id: toNullable(values.entrenador_id),
      duracion_minutos: duration,
      cupo_maximo: capacity,
      fecha_inicio: values.fecha_inicio,
      fecha_fin: values.fecha_fin || null,
    },
    rules,
  };
}

function toUpdatePatch(values: TrainingWizardValues) {
  return {
    nombre: values.nombre.trim(),
    descripcion: toNullable(values.descripcion),
    disciplina_id: values.disciplina_id,
    escenario_id: values.escenario_id,
    entrenador_id: toNullable(values.entrenador_id),
    duracion_minutos: parsePositiveInt(values.duracion_minutos),
    cupo_maximo: parsePositiveInt(values.cupo_maximo),
  };
}

function toUpdateRules(values: TrainingWizardValues) {
  if (values.tipo !== 'recurrente') {
    return [];
  }

  return values.reglas
    .filter((rule) => {
      if (rule.tipo_bloque === 'una_vez_dia') {
        return rule.hora_inicio.trim().length > 0;
      }
      if (rule.tipo_bloque === 'franja_repeticion') {
        return rule.hora_inicio.trim().length > 0 || rule.hora_fin.trim().length > 0;
      }
      return rule.horas_especificas.length > 0;
    })
    .map((rule) => ({
      dias_semana: values.dias_semana.map((value) => Number(value)),
      repetir_cada_semanas: Number(values.repetir_cada_semanas || '1'),
      tipo_bloque: rule.tipo_bloque,
      hora_inicio: rule.tipo_bloque === 'horas_especificas' ? null : rule.hora_inicio,
      hora_fin: rule.tipo_bloque === 'franja_repeticion' ? rule.hora_fin : null,
      horas_especificas: rule.tipo_bloque === 'horas_especificas' ? rule.horas_especificas : null,
    }));
}

export function useEntrenamientos({ tenantId }: UseEntrenamientosOptions): UseEntrenamientosResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(EMPTY_SUCCESS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [groups, setGroups] = useState<TrainingGroupWithDetails[]>([]);
  const [instances, setInstances] = useState<TrainingInstance[]>([]);
  const [disciplinas, setDisciplinas] = useState<SelectOption[]>([]);
  const [escenarios, setEscenarios] = useState<SelectOption[]>([]);
  const [entrenadores, setEntrenadores] = useState<SelectOption[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [isUniqueTypeLocked, setIsUniqueTypeLocked] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const form = useEntrenamientoForm();
  const scope = useEntrenamientoScope();
  const calendar = useEntrenamientosCalendar();

  const groupsById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  const calendarItems = useMemo(() => {
    return instances.map((instance) => toTrainingCalendarItem(instance, groupsById));
  }, [groupsById, instances]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No active session');
      }

      const [groupsData, instancesData, disciplinasData, escenariosData, entrenadoresData] = await Promise.all([
        entrenamientosService.listTrainingGroupsByTenant(tenantId),
        entrenamientosService.listTrainingInstancesByTenantAndRange(tenantId, calendar.range.from, calendar.range.to),
        entrenamientosService.listDisciplineOptions(tenantId),
        entrenamientosService.listScenarioOptions(tenantId),
        entrenamientosService.listTrainerOptions(tenantId),
      ]);

      setGroups(groupsData);
      setInstances(instancesData);
      setDisciplinas(disciplinasData);
      setEscenarios(escenariosData);
      setEntrenadores(entrenadoresData);
    } catch {
      setGroups([]);
      setInstances([]);
      setError('No fue posible cargar los entrenamientos de la organización.');
    } finally {
      setLoading(false);
    }
  }, [calendar.range.from, calendar.range.to, supabase, tenantId]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await loadAll();
    };

    void execute();

    return () => {
      mounted = false;
    };
  }, [loadAll]);

  const openCreateModal = useCallback(() => {
    setFormMode('create');
    setEditTarget(null);
    setIsUniqueTypeLocked(false);
    form.resetForm();
    setSubmitError(null);
    setSuccessMessage(null);
    setFormOpen(true);
  }, [form]);

  const requestEditGroup = useCallback(
    () => {
      setSubmitError('La serie no se puede editar.');
      setSuccessMessage(null);
    },
    [],
  );

  const requestEditInstance = useCallback(
    (instance: TrainingInstance) => {
      if (isHistoricalTraining(instance)) {
        setSubmitError('No se pueden editar entrenamientos pasados.');
        setSuccessMessage(null);
        return;
      }

      scope.openScopeModal({
        action: 'edit',
        source: 'instance',
        trainingGroupId: instance.entrenamiento_grupo_id ?? undefined,
        trainingId: instance.id,
        effectiveFrom: instance.fecha_hora,
        allowedScopes: ['single'],
      });
    },
    [scope],
  );

  const requestDeleteGroup = useCallback(
    (group: TrainingGroupWithDetails) => {
      scope.openScopeModal({
        action: 'delete',
        source: 'group',
        trainingGroupId: group.id,
        allowedScopes: ['series'],
      });
    },
    [scope],
  );

  const requestDeleteInstance = useCallback(
    (instance: TrainingInstance) => {
      const relatedGroup = instance.entrenamiento_grupo_id ? groupsById.get(instance.entrenamiento_grupo_id) : undefined;
      const isRecurrentEvent = relatedGroup?.tipo === 'recurrente';

      if (isHistoricalTraining(instance)) {
        setSubmitError('No se pueden eliminar entrenamientos pasados.');
        setSuccessMessage(null);
        return;
      }

      scope.openScopeModal({
        action: 'delete',
        source: 'instance',
        trainingGroupId: instance.entrenamiento_grupo_id ?? undefined,
        trainingId: instance.id,
        effectiveFrom: instance.fecha_hora,
        allowedScopes: isRecurrentEvent ? ['series'] : ['single'],
      });
    },
    [groupsById, scope],
  );

  const closeFormModal = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setFormOpen(false);
    setSubmitError(null);
  }, [isSubmitting]);

  const prepareEditFromGroup = useCallback(
    (group: TrainingGroupWithDetails, selectedScope: TrainingScope) => {
      const recurringDefaults = getRecurringDefaultsFromRules(group.reglas);

      const values: TrainingWizardValues = {
        nombre: group.nombre,
        descripcion: group.descripcion ?? '',
        disciplina_id: group.disciplina_id,
        escenario_id: group.escenario_id,
        entrenador_id: group.entrenador_id ?? '',
        duracion_minutos: group.duracion_minutos != null ? String(group.duracion_minutos) : '',
        cupo_maximo: group.cupo_maximo != null ? String(group.cupo_maximo) : '',
        tipo: group.tipo,
        fecha_inicio: group.fecha_inicio,
        fecha_fin: group.fecha_fin ?? '',
        fecha_hora_unico: '',
        dias_semana: recurringDefaults.dias_semana,
        repetir_cada_semanas: recurringDefaults.repetir_cada_semanas,
        reglas:
          group.reglas.length > 0
            ? group.reglas.map(toRuleForm)
            : [{ tipo_bloque: 'una_vez_dia', hora_inicio: '', hora_fin: '', horas_especificas: [] }],
      };

      form.setFormValuesFromExternal(values);
      setFormMode('edit');
      setIsUniqueTypeLocked(group.tipo === 'unico');
      setEditTarget({
        source: 'group',
        scope: selectedScope,
        trainingGroupId: group.id,
        effectiveFrom: group.fecha_inicio,
      });
      setSubmitError(null);
      setSuccessMessage(null);
      setFormOpen(true);
    },
    [form],
  );

  const prepareEditFromInstance = useCallback(
    (instance: TrainingInstance, selectedScope: TrainingScope) => {
      const relatedGroup = instance.entrenamiento_grupo_id ? groupsById.get(instance.entrenamiento_grupo_id) : undefined;
      const recurringDefaults = getRecurringDefaultsFromRules(relatedGroup?.reglas ?? []);

      if (selectedScope === 'single') {
        const dateOnly = instance.fecha_hora ? toDateOnlyFromIso(instance.fecha_hora) : '';
        const dateTimeLocal = instance.fecha_hora ? toDateTimeLocalInBogota(instance.fecha_hora) : '';

        const values: TrainingWizardValues = {
          nombre: instance.nombre,
          descripcion: instance.descripcion ?? '',
          disciplina_id: instance.disciplina_id,
          escenario_id: instance.escenario_id,
          entrenador_id: instance.entrenador_id ?? '',
          duracion_minutos: instance.duracion_minutos != null ? String(instance.duracion_minutos) : '',
          cupo_maximo: instance.cupo_maximo != null ? String(instance.cupo_maximo) : '',
          tipo: 'unico',
          fecha_inicio: dateOnly,
          fecha_fin: '',
          fecha_hora_unico: dateTimeLocal,
          dias_semana: [],
          repetir_cada_semanas: '1',
          reglas: [{ tipo_bloque: 'una_vez_dia', hora_inicio: '', hora_fin: '', horas_especificas: [] }],
        };

        form.setFormValuesFromExternal(values);
        setFormMode('edit');
        setIsUniqueTypeLocked(true);
        setEditTarget({
          source: 'instance',
          scope: selectedScope,
          trainingGroupId: instance.entrenamiento_grupo_id ?? undefined,
          trainingId: instance.id,
          effectiveFrom: instance.fecha_hora ?? undefined,
        });
        setSubmitError(null);
        setSuccessMessage(null);
        setFormOpen(true);
        return;
      }

      const values: TrainingWizardValues = {
        nombre: instance.nombre,
        descripcion: instance.descripcion ?? '',
        disciplina_id: instance.disciplina_id,
        escenario_id: instance.escenario_id,
        entrenador_id: instance.entrenador_id ?? '',
        duracion_minutos: instance.duracion_minutos != null ? String(instance.duracion_minutos) : '',
        cupo_maximo: instance.cupo_maximo != null ? String(instance.cupo_maximo) : '',
        tipo: relatedGroup?.tipo ?? 'unico',
        fecha_inicio: relatedGroup?.fecha_inicio ?? (instance.fecha_hora ? toDateOnlyFromIso(instance.fecha_hora) : ''),
        fecha_fin: relatedGroup?.fecha_fin ?? '',
        fecha_hora_unico: instance.fecha_hora ? toDateTimeLocalInBogota(instance.fecha_hora) : '',
        dias_semana: recurringDefaults.dias_semana,
        repetir_cada_semanas: recurringDefaults.repetir_cada_semanas,
        reglas:
          relatedGroup?.reglas.length && relatedGroup.tipo === 'recurrente'
            ? relatedGroup.reglas.map(toRuleForm)
            : [{ tipo_bloque: 'una_vez_dia', hora_inicio: '', hora_fin: '', horas_especificas: [] }],
      };

      form.setFormValuesFromExternal(values);
      setFormMode('edit');
      setIsUniqueTypeLocked((relatedGroup?.tipo ?? 'unico') === 'unico');
      setEditTarget({
        source: 'instance',
        scope: selectedScope,
        trainingGroupId: instance.entrenamiento_grupo_id ?? undefined,
        trainingId: instance.id,
        effectiveFrom: instance.fecha_hora ?? undefined,
      });
      setSubmitError(null);
      setSuccessMessage(null);
      setFormOpen(true);
    },
    [form, groupsById],
  );

  const executeDeleteWithScope = useCallback(
    async (targetScope: TrainingScope) => {
      const scopeContext = scope.scopeSelection.context;
      if (!scopeContext) {
        return;
      }

      const confirmed = window.confirm('¿Confirmas la eliminación con el alcance seleccionado?');
      if (!confirmed) {
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      setSuccessMessage(null);

      try {
        await entrenamientosService.deleteTrainingWithScope({
          tenantId,
          scope: targetScope,
          trainingGroupId: scopeContext.trainingGroupId,
          trainingId: scopeContext.trainingId,
          effectiveFrom: scopeContext.effectiveFrom ?? undefined,
        });

        await loadAll();
        setSuccessMessage('Entrenamiento eliminado correctamente.');
      } catch (caughtError) {
        setSubmitError(
          mapServiceErrorToMessage(caughtError, 'No fue posible eliminar el entrenamiento. Inténtalo nuevamente.'),
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadAll, scope.scopeSelection.context, tenantId],
  );

  const confirmScope = useCallback(
    async (selectedScope: TrainingScope) => {
      const resolution = scope.resolveScope(selectedScope);
      const context = resolution.context;

      if (!context) {
        return;
      }

      if (context.action === 'delete') {
        await executeDeleteWithScope(selectedScope);
        return;
      }

      if (context.source === 'group') {
        const targetGroup = context.trainingGroupId ? groupsById.get(context.trainingGroupId) : undefined;
        if (!targetGroup) {
          return;
        }
        prepareEditFromGroup(targetGroup, selectedScope);
        return;
      }

      const targetInstance = context.trainingId
        ? instances.find((instance) => instance.id === context.trainingId)
        : undefined;

      if (!targetInstance) {
        return;
      }

      prepareEditFromInstance(targetInstance, selectedScope);
    },
    [executeDeleteWithScope, groupsById, instances, prepareEditFromGroup, prepareEditFromInstance, scope],
  );

  const submitForm = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    const validation = form.validate(form.formValues);
    if (!validation.valid) {
      return false;
    }

    setIsSubmitting(true);

    try {
      if (formMode === 'create') {
        await entrenamientosService.createTrainingSeries(toCreatePayload(tenantId, form.formValues));
        await loadAll();
        setSuccessMessage('Entrenamiento creado correctamente.');
        setFormOpen(false);
        return true;
      }

      if (!editTarget) {
        return false;
      }

      if (editTarget.source === 'group' && editTarget.trainingGroupId) {
        await entrenamientosService.updateTrainingSeries({
          tenantId,
          trainingGroupId: editTarget.trainingGroupId,
          scope: editTarget.scope === 'single' ? 'future' : editTarget.scope,
          effectiveFrom: editTarget.effectiveFrom,
          groupPatch: {
            ...toUpdatePatch(form.formValues),
            fecha_inicio: form.formValues.fecha_inicio,
            fecha_fin: form.formValues.tipo === 'recurrente' ? form.formValues.fecha_fin || null : null,
          },
          rules: toUpdateRules(form.formValues),
        });
      }

      if (editTarget.source === 'instance' && editTarget.trainingId) {
        if (editTarget.scope === 'single') {
          await entrenamientosService.updateTrainingInstance({
            tenantId,
            trainingId: editTarget.trainingId,
            trainingGroupId: editTarget.trainingGroupId,
            effectiveFrom: editTarget.effectiveFrom,
            scope: 'single',
            patch: {
              ...toUpdatePatch(form.formValues),
              fecha_hora: form.formValues.fecha_hora_unico ? toBogotaIsoFromLocalInput(form.formValues.fecha_hora_unico) : null,
            },
          });
        } else if (editTarget.trainingGroupId) {
          await entrenamientosService.updateTrainingSeries({
            tenantId,
            trainingGroupId: editTarget.trainingGroupId,
            scope: editTarget.scope,
            effectiveFrom: editTarget.effectiveFrom,
            groupPatch: {
              ...toUpdatePatch(form.formValues),
              fecha_inicio: form.formValues.fecha_inicio,
              fecha_fin: form.formValues.tipo === 'recurrente' ? form.formValues.fecha_fin || null : null,
            },
            rules: toUpdateRules(form.formValues),
          });
        } else {
          throw new TrainingServiceError('validation', 'No se encontró la serie asociada para aplicar el alcance seleccionado.');
        }
      }

      await loadAll();
      setSuccessMessage('Entrenamiento actualizado correctamente.');
      setFormOpen(false);
      return true;
    } catch (caughtError) {
      setSubmitError(mapServiceErrorToMessage(caughtError, 'No fue posible guardar el entrenamiento.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [editTarget, form, formMode, loadAll, tenantId]);

  return {
    loading,
    error,
    submitError,
    successMessage,
    isSubmitting,
    groups,
    instances,
    calendarItems,
    disciplinas,
    escenarios,
    entrenadores,
    monthLabel: calendar.range.label,
    monthStartDate: calendar.range.from,
    formOpen,
    formMode,
    isEditingSingleInstance: formMode === 'edit' && editTarget?.source === 'instance' && editTarget.scope === 'single',
    isUniqueTypeLocked,
    scopeOpen: scope.scopeSelection.open,
    scopeAllowed: scope.scopeSelection.context?.allowedScopes ?? ['single', 'future', 'series'],
    scopeAction: scope.scopeSelection.context?.action ?? null,
    formValues: form.formValues,
    fieldErrors: form.fieldErrors,
    ruleErrors: form.ruleErrors,
    goToNextMonth: calendar.goToNextMonth,
    goToPreviousMonth: calendar.goToPreviousMonth,
    refresh: loadAll,
    openCreateModal,
    requestEditGroup,
    requestEditInstance,
    requestDeleteGroup,
    requestDeleteInstance,
    closeFormModal,
    closeScopeModal: scope.closeScopeModal,
    confirmScope,
    submitForm,
    updateField: form.updateField,
    addRule: form.addRule,
    removeRule: form.removeRule,
    updateRuleField: form.updateRuleField,
  };
}
