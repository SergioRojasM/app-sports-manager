'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { scenariosService } from '@/services/supabase/portal/scenarios.service';
import type {
  CreateScenarioInput,
  ScenarioFieldErrors,
  ScenarioFormValues,
  ScenarioScheduleFieldErrors,
  ScenarioScheduleFormValue,
  ScenarioValidationError,
  ScenarioWithAvailability,
  ScenariosViewModel,
  UpdateScenarioInput,
} from '@/types/portal/scenarios.types';

const EMPTY_SCHEDULE: ScenarioScheduleFormValue = {
  dia_semana: '',
  hora_inicio: '',
  hora_fin: '',
  disponible: true,
};

const EMPTY_FORM: ScenarioFormValues = {
  nombre: '',
  descripcion: '',
  ubicacion: '',
  direccion: '',
  coordenadas: '',
  capacidad: '',
  tipo: '',
  activo: true,
  image_url: '',
  schedules: [],
};

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasAnyScheduleValue(schedule: ScenarioScheduleFormValue): boolean {
  return (
    schedule.dia_semana.trim().length > 0 ||
    schedule.hora_inicio.trim().length > 0 ||
    schedule.hora_fin.trim().length > 0
  );
}

function toFormValues(scenario: ScenarioWithAvailability): ScenarioFormValues {
  return {
    nombre: scenario.nombre,
    descripcion: scenario.descripcion ?? '',
    ubicacion: scenario.ubicacion ?? '',
    direccion: scenario.direccion ?? '',
    coordenadas: scenario.coordenadas ?? '',
    capacidad: scenario.capacidad != null ? String(scenario.capacidad) : '',
    tipo: scenario.tipo,
    activo: scenario.activo,
    image_url: scenario.image_url ?? '',
    schedules: scenario.schedules.map((schedule) => ({
      dia_semana: String(schedule.dia_semana),
      hora_inicio: schedule.hora_inicio,
      hora_fin: schedule.hora_fin,
      disponible: schedule.disponible,
    })),
  };
}

function compareTimes(start: string, end: string): number {
  return start.localeCompare(end);
}

type UseScenariosOptions = {
  tenantId: string;
};

type UseScenariosResult = ScenariosViewModel & {
  isSubmitting: boolean;
  searchTerm: string;
  formValues: ScenarioFormValues;
  fieldErrors: ScenarioFieldErrors;
  scheduleErrors: ScenarioScheduleFieldErrors;
  setSearchTerm: (value: string) => void;
  openCreateModal: () => void;
  openEditModal: (scenario: ScenarioWithAvailability) => void;
  deleteScenario: (scenario: ScenarioWithAvailability) => Promise<void>;
  closeModal: () => void;
  updateField: (field: keyof ScenarioFormValues, value: string | boolean) => void;
  addSchedule: () => void;
  removeSchedule: (index: number) => void;
  updateScheduleField: (
    index: number,
    field: keyof ScenarioScheduleFormValue,
    value: string | boolean,
  ) => void;
  submit: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

export function useScenarios({ tenantId }: UseScenariosOptions): UseScenariosResult {
  const [scenarios, setScenarios] = useState<ScenarioWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioWithAvailability | null>(null);
  const [formValues, setFormValues] = useState<ScenarioFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<ScenarioFieldErrors>({});
  const [scheduleErrors, setScheduleErrors] = useState<ScenarioScheduleFieldErrors>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No active session');
      }

      const payload = await scenariosService.listScenariosByTenant(tenantId);
      setScenarios(payload);
    } catch {
      setScenarios([]);
      setError('No fue posible cargar los escenarios de la organización.');
    } finally {
      setLoading(false);
    }
  }, [supabase, tenantId]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await loadScenarios();
    };

    void execute();

    return () => {
      mounted = false;
    };
  }, [loadScenarios]);

  const filteredScenarios = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return scenarios;
    }

    return scenarios.filter((scenario) => {
      const haystack = [scenario.nombre, scenario.tipo, scenario.ubicacion ?? '', scenario.descripcion ?? '']
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [scenarios, searchTerm]);

  const resetFormState = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setScheduleErrors([]);
    setSubmitError(null);
  }, []);

  const openCreateModal = useCallback(() => {
    setModalMode('create');
    setSelectedScenario(null);
    resetFormState();
    setModalOpen(true);
    setSuccessMessage(null);
  }, [resetFormState]);

  const openEditModal = useCallback((scenario: ScenarioWithAvailability) => {
    setModalMode('edit');
    setSelectedScenario(scenario);
    setFormValues(toFormValues(scenario));
    setFieldErrors({});
    setScheduleErrors([]);
    setSubmitError(null);
    setModalOpen(true);
    setSuccessMessage(null);
  }, []);

  const deleteScenario = useCallback(
    async (scenario: ScenarioWithAvailability) => {
      const shouldDelete = window.confirm(
        `¿Seguro que quieres eliminar el escenario "${scenario.nombre}"? Esta acción no se puede deshacer.`,
      );

      if (!shouldDelete) {
        return;
      }

      setSubmitError(null);
      setSuccessMessage(null);

      try {
        await scenariosService.deleteScenario(scenario.id, tenantId);

        if (selectedScenario?.id === scenario.id) {
          setModalOpen(false);
          setSelectedScenario(null);
        }

        await loadScenarios();
        setSuccessMessage('Escenario eliminado correctamente.');
      } catch {
        setSubmitError('No fue posible eliminar el escenario. Inténtalo nuevamente.');
      }
    },
    [loadScenarios, selectedScenario?.id, tenantId],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFieldErrors({});
    setScheduleErrors([]);
    setSubmitError(null);
  }, []);

  const updateField = useCallback((field: keyof ScenarioFormValues, value: string | boolean) => {
    setFormValues((current) => ({ ...current, [field]: value }) as ScenarioFormValues);
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as keyof ScenarioFieldErrors];
      return next;
    });
  }, []);

  const addSchedule = useCallback(() => {
    setFormValues((current) => ({
      ...current,
      schedules: [...current.schedules, EMPTY_SCHEDULE],
    }));
    setScheduleErrors((current) => [...current, {}]);
  }, []);

  const removeSchedule = useCallback((index: number) => {
    setFormValues((current) => ({
      ...current,
      schedules: current.schedules.filter((_, currentIndex) => currentIndex !== index),
    }));
    setScheduleErrors((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const updateScheduleField = useCallback(
    (index: number, field: keyof ScenarioScheduleFormValue, value: string | boolean) => {
      setFormValues((current) => ({
        ...current,
        schedules: current.schedules.map((schedule, currentIndex) =>
          currentIndex === index ? ({ ...schedule, [field]: value } as ScenarioScheduleFormValue) : schedule,
        ),
      }));

      setScheduleErrors((current) => {
        if (!current[index]?.[field as 'dia_semana' | 'hora_inicio' | 'hora_fin']) {
          return current;
        }

        return current.map((entry, currentIndex) => {
          if (currentIndex !== index) {
            return entry;
          }

          const next = { ...entry };
          delete next[field as 'dia_semana' | 'hora_inicio' | 'hora_fin'];
          return next;
        });
      });
    },
    [],
  );

  const validate = useCallback((values: ScenarioFormValues) => {
    const nextFieldErrors: ScenarioFieldErrors = {};
    const nextScheduleErrors: ScenarioScheduleFieldErrors = values.schedules.map(() => ({}));
    const errors: ScenarioValidationError[] = [];

    const nombre = values.nombre.trim();
    if (!nombre) {
      nextFieldErrors.nombre = 'El nombre es obligatorio.';
      errors.push({ field: 'nombre', message: nextFieldErrors.nombre });
    }

    const tipo = values.tipo.trim();
    if (!tipo) {
      nextFieldErrors.tipo = 'El tipo es obligatorio.';
      errors.push({ field: 'tipo', message: nextFieldErrors.tipo });
    }

    const capacidad = values.capacidad.trim();
    if (capacidad) {
      const parsedCapacity = Number(capacidad);
      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        nextFieldErrors.capacidad = 'La capacidad debe ser un número entero positivo.';
        errors.push({ field: 'capacidad', message: nextFieldErrors.capacidad });
      }
    }

    const imageUrl = values.image_url.trim();
    if (imageUrl && !isValidUrl(imageUrl)) {
      nextFieldErrors.image_url = 'Ingresa una URL válida (http o https).';
      errors.push({ field: 'image_url', message: nextFieldErrors.image_url });
    }

    values.schedules.forEach((schedule, index) => {
      if (!hasAnyScheduleValue(schedule)) {
        return;
      }

      const day = schedule.dia_semana.trim();
      const start = schedule.hora_inicio.trim();
      const end = schedule.hora_fin.trim();

      if (!day) {
        nextScheduleErrors[index].dia_semana = 'El día es obligatorio.';
        errors.push({ field: 'dia_semana', message: nextScheduleErrors[index].dia_semana!, scheduleIndex: index });
      } else {
        const dayNumber = Number(day);
        if (!Number.isInteger(dayNumber) || dayNumber < 0 || dayNumber > 6) {
          nextScheduleErrors[index].dia_semana = 'El día debe estar entre 0 y 6.';
          errors.push({ field: 'dia_semana', message: nextScheduleErrors[index].dia_semana!, scheduleIndex: index });
        }
      }

      if (!start) {
        nextScheduleErrors[index].hora_inicio = 'La hora de inicio es obligatoria.';
        errors.push({ field: 'hora_inicio', message: nextScheduleErrors[index].hora_inicio!, scheduleIndex: index });
      }

      if (!end) {
        nextScheduleErrors[index].hora_fin = 'La hora de fin es obligatoria.';
        errors.push({ field: 'hora_fin', message: nextScheduleErrors[index].hora_fin!, scheduleIndex: index });
      }

      if (start && end && compareTimes(start, end) >= 0) {
        nextScheduleErrors[index].hora_fin = 'La hora de fin debe ser mayor a la hora de inicio.';
        errors.push({ field: 'hora_fin', message: nextScheduleErrors[index].hora_fin!, scheduleIndex: index });
      }
    });

    return {
      valid: errors.length === 0,
      fieldErrors: nextFieldErrors,
      scheduleErrors: nextScheduleErrors,
      errors,
    };
  }, []);

  const submit = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    const validation = validate(formValues);
    setFieldErrors(validation.fieldErrors);
    setScheduleErrors(validation.scheduleErrors);

    if (!validation.valid) {
      return false;
    }

    setIsSubmitting(true);

    try {
      let savedScenarioId = selectedScenario?.id ?? null;

      if (modalMode === 'create') {
        const payload: CreateScenarioInput = {
          tenantId,
          nombre: formValues.nombre.trim(),
          descripcion: toNullable(formValues.descripcion),
          ubicacion: toNullable(formValues.ubicacion),
          direccion: toNullable(formValues.direccion),
          coordenadas: toNullable(formValues.coordenadas),
          capacidad: formValues.capacidad.trim() ? Number(formValues.capacidad.trim()) : null,
          tipo: formValues.tipo.trim(),
          activo: formValues.activo,
          image_url: toNullable(formValues.image_url),
        };

        const createdScenario = await scenariosService.createScenario(payload);
        savedScenarioId = createdScenario.id;
      }

      if (modalMode === 'edit' && selectedScenario) {
        const payload: UpdateScenarioInput = {
          tenantId,
          nombre: formValues.nombre.trim(),
          descripcion: toNullable(formValues.descripcion),
          ubicacion: toNullable(formValues.ubicacion),
          direccion: toNullable(formValues.direccion),
          coordenadas: toNullable(formValues.coordenadas),
          capacidad: formValues.capacidad.trim() ? Number(formValues.capacidad.trim()) : null,
          tipo: formValues.tipo.trim(),
          activo: formValues.activo,
          image_url: toNullable(formValues.image_url),
        };

        const updatedScenario = await scenariosService.updateScenario(selectedScenario.id, payload);
        savedScenarioId = updatedScenario.id;
      }

      if (!savedScenarioId) {
        throw new Error('Scenario id missing');
      }

      const normalizedSchedules = formValues.schedules
        .filter((schedule) => hasAnyScheduleValue(schedule))
        .map((schedule) => ({
          dia_semana: Number(schedule.dia_semana),
          hora_inicio: schedule.hora_inicio,
          hora_fin: schedule.hora_fin,
          disponible: schedule.disponible,
        }));

      await scenariosService.upsertScenarioSchedules(tenantId, savedScenarioId, {
        schedules: normalizedSchedules,
      });

      await loadScenarios();
      setSuccessMessage(
        modalMode === 'create'
          ? 'Escenario creado correctamente.'
          : 'Escenario actualizado correctamente.',
      );
      setModalOpen(false);
      return true;
    } catch {
      setSubmitError('No fue posible guardar el escenario. Inténtalo nuevamente.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formValues, loadScenarios, modalMode, selectedScenario, tenantId, validate]);

  return {
    scenarios,
    filteredScenarios,
    loading,
    error,
    modalOpen,
    modalMode,
    selectedScenario,
    submitError,
    successMessage,
    searchTerm,
    formValues,
    fieldErrors,
    scheduleErrors,
    isSubmitting,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    deleteScenario,
    closeModal,
    updateField,
    addSchedule,
    removeSchedule,
    updateScheduleField,
    submit,
    refresh: loadScenarios,
  };
}
