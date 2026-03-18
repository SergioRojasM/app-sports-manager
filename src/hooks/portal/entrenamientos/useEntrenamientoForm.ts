'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  CategoriasFormState,
  TrainingFieldErrors,
  TrainingRuleErrors,
  TrainingVisibility,
  TrainingWizardRuleFormValue,
  TrainingWizardValues,
} from '@/types/portal/entrenamientos.types';
import type { NivelDisciplina } from '@/types/portal/nivel-disciplina.types';
import type { EntrenamientoRestriccionInput } from '@/types/entrenamiento-restricciones.types';
import { nivelDisciplinaService } from '@/services/supabase/portal/nivel-disciplina.service';

const EMPTY_RESTRICCION: EntrenamientoRestriccionInput = {
  usuario_estado: null,
  plan_id: null,
  disciplina_id: null,
  validar_nivel_disciplina: false,
  orden: 1,
};

const EMPTY_RULE: TrainingWizardRuleFormValue = {
  tipo_bloque: 'una_vez_dia',
  hora_inicio: '',
  hora_fin: '',
  horas_especificas: [],
};

const EMPTY_FORM: TrainingWizardValues = {
  nombre: '',
  descripcion: '',
  punto_encuentro: '',
  formulario_externo: '',
  disciplina_id: '',
  escenario_id: '',
  entrenador_id: '',
  duracion_minutos: '',
  cupo_maximo: '',
  visibilidad: 'privado' as TrainingVisibility,
  tipo: 'unico',
  fecha_inicio: '',
  fecha_fin: '',
  fecha_hora_unico: '',
  dias_semana: [],
  repetir_cada_semanas: '1',
  reglas: [EMPTY_RULE],
};

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function compareTimes(start: string, end: string): number {
  return start.localeCompare(end);
}

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hasRuleContent(rule: TrainingWizardRuleFormValue): boolean {
  if (rule.tipo_bloque === 'una_vez_dia') {
    return rule.hora_inicio.trim().length > 0;
  }

  if (rule.tipo_bloque === 'franja_repeticion') {
    return rule.hora_inicio.trim().length > 0 || rule.hora_fin.trim().length > 0;
  }

  return rule.horas_especificas.length > 0;
}

function parseTimeToMinutes(timeValue: string): number | null {
  const trimmed = timeValue.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    return null;
  }

  const [hoursRaw, minutesRaw] = trimmed.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function computeStartsInMinutes(rule: TrainingWizardRuleFormValue, durationMinutes: number): number[] {
  if (rule.tipo_bloque === 'una_vez_dia') {
    const start = parseTimeToMinutes(rule.hora_inicio);
    return start == null ? [] : [start];
  }

  if (rule.tipo_bloque === 'franja_repeticion') {
    const start = parseTimeToMinutes(rule.hora_inicio);
    const end = parseTimeToMinutes(rule.hora_fin);
    if (start == null || end == null || end <= start) {
      return [];
    }

    const starts: number[] = [];
    for (let cursor = start; cursor + durationMinutes <= end; cursor += durationMinutes) {
      starts.push(cursor);
    }
    return starts;
  }

  return rule.horas_especificas
    .map((value) => parseTimeToMinutes(value))
    .filter((value): value is number => value != null);
}

export function useEntrenamientoForm() {
  const [formValues, setFormValues] = useState<TrainingWizardValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<TrainingFieldErrors>({});
  const [ruleErrors, setRuleErrors] = useState<TrainingRuleErrors>([]);

  // Categories state
  const [categoriasForm, setCategoriasForm] = useState<CategoriasFormState>({ enabled: false, items: {} });
  const [disciplinaHasNiveles, setDisciplinaHasNiveles] = useState(false);
  const [activeNiveles, setActiveNiveles] = useState<NivelDisciplina[]>([]);
  const [categoriasError, setCategoriasError] = useState<string | null>(null);

  // Restriction state
  const [restricciones, setRestricciones] = useState<EntrenamientoRestriccionInput[]>([]);
  const [reservaAntelacionHoras, setReservaAntelacionHoras] = useState<number | null>(null);
  const [cancelacionAntelacionHoras, setCancelacionAntelacionHoras] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setRuleErrors([]);
    setCategoriasForm({ enabled: false, items: {} });
    setDisciplinaHasNiveles(false);
    setActiveNiveles([]);
    setCategoriasError(null);
    setRestricciones([]);
    setReservaAntelacionHoras(null);
    setCancelacionAntelacionHoras(null);
  }, []);

  const setFormValuesFromExternal = useCallback((values: TrainingWizardValues) => {
    setFormValues(values);
    setFieldErrors({});
    setRuleErrors(values.reglas.map(() => ({})));
  }, []);

  const updateField = useCallback((field: keyof TrainingWizardValues, value: string) => {
    setFormValues((current) => {
      if (field === 'dias_semana') {
        const parsedDays = value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        return { ...current, dias_semana: parsedDays };
      }

      return { ...current, [field]: value };
    });
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as keyof TrainingFieldErrors];
      return next;
    });
  }, []);

  const addRule = useCallback(() => {
    setFormValues((current) => ({
      ...current,
      reglas: [...current.reglas, EMPTY_RULE],
    }));
    setRuleErrors((current) => [...current, {}]);
  }, []);

  const removeRule = useCallback((index: number) => {
    setFormValues((current) => ({
      ...current,
      reglas: current.reglas.filter((_, currentIndex) => currentIndex !== index),
    }));
    setRuleErrors((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const updateRuleField = useCallback(
    (index: number, field: keyof TrainingWizardRuleFormValue, value: string | string[]) => {
      setFormValues((current) => ({
        ...current,
        reglas: current.reglas.map((rule, currentIndex) =>
          currentIndex === index ? ({ ...rule, [field]: value } as TrainingWizardRuleFormValue) : rule,
        ),
      }));

      setRuleErrors((current) => {
        if (!current[index]) return current;
        const next = [...current];
        const target = { ...next[index] };
        if (field === 'tipo_bloque' || field === 'hora_inicio' || field === 'hora_fin' || field === 'horas_especificas') {
          delete target[field];
        }
        next[index] = target;
        return next;
      });
    },
    [],
  );

  const validate = useCallback((values: TrainingWizardValues) => {
    const nextFieldErrors: TrainingFieldErrors = {};
    const nextRuleErrors: TrainingRuleErrors = values.reglas.map(() => ({}));
    const todayDateKey = getTodayDateKey();

    if (!values.disciplina_id.trim()) {
      nextFieldErrors.disciplina_id = 'La disciplina es obligatoria.';
    }

    if (!values.escenario_id.trim()) {
      nextFieldErrors.escenario_id = 'El escenario es obligatorio.';
    }

    if (!values.tipo.trim()) {
      nextFieldErrors.tipo = 'Debes seleccionar el tipo de entrenamiento.';
    }

    if (values.visibilidad !== 'publico' && values.visibilidad !== 'privado') {
      nextFieldErrors.visibilidad = 'La visibilidad debe ser "publico" o "privado".';
    }

    if (values.duracion_minutos.trim()) {
      const parsedDuration = Number(values.duracion_minutos.trim());
      if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
        nextFieldErrors.duracion_minutos = 'La duración debe ser un número entero mayor a 0.';
      }
    }

    if (values.cupo_maximo.trim()) {
      const parsedCapacity = Number(values.cupo_maximo.trim());
      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        nextFieldErrors.cupo_maximo = 'El cupo debe ser un número entero mayor a 0.';
      }
    }

    if (values.fecha_inicio.trim() && values.fecha_fin.trim()) {
      const start = new Date(`${values.fecha_inicio}T00:00:00`);
      const end = new Date(`${values.fecha_fin}T00:00:00`);

      if (end < start) {
        nextFieldErrors.fecha_fin = 'La fecha fin no puede ser menor que la fecha inicio.';
      }

      if (end > addMonths(start, 6)) {
        nextFieldErrors.fecha_fin = 'La fecha fin no puede superar 6 meses desde la fecha inicio.';
      }
    }

    if (values.tipo === 'unico') {
      if (!values.fecha_hora_unico.trim()) {
        nextFieldErrors.fecha_hora_unico = 'Debes indicar fecha y hora del entrenamiento único.';
      } else {
        const selectedDate = values.fecha_hora_unico.slice(0, 10);
        if (selectedDate < todayDateKey) {
          nextFieldErrors.fecha_hora_unico = 'La fecha debe ser desde hoy.';
        }
      }
    }

    if (values.tipo === 'recurrente') {
      if (!values.fecha_inicio.trim()) {
        nextFieldErrors.fecha_inicio = 'La fecha de inicio es obligatoria.';
      } else if (values.fecha_inicio < todayDateKey) {
        nextFieldErrors.fecha_inicio = 'La fecha de inicio debe ser desde hoy.';
      }

      if (!values.fecha_fin.trim()) {
        nextFieldErrors.fecha_fin = 'La fecha fin es obligatoria para entrenamientos recurrentes.';
      }

      if (values.dias_semana.length === 0) {
        nextFieldErrors.dias_semana = 'Debes seleccionar al menos un día de la semana.';
      }

      const repeatEvery = Number(values.repetir_cada_semanas);
      if (!Number.isInteger(repeatEvery) || repeatEvery < 1) {
        nextFieldErrors.repetir_cada_semanas = 'Repetir cada semanas debe ser un entero mayor o igual a 1.';
      }

      const activeRules = values.reglas.filter(hasRuleContent);
      if (activeRules.length === 0) {
        nextFieldErrors.fecha_fin = 'Debes configurar al menos una regla de recurrencia.';
      }

      const durationMinutes = Number(values.duracion_minutos);
      const canValidateOverlaps = Number.isInteger(durationMinutes) && durationMinutes > 0;

      values.reglas.forEach((rule, index) => {
        if (!hasRuleContent(rule)) {
          return;
        }

        if (rule.tipo_bloque === 'una_vez_dia') {
          if (!rule.hora_inicio.trim()) {
            nextRuleErrors[index].hora_inicio = 'Hora inicio obligatoria.';
          }
        }

        if (rule.tipo_bloque === 'franja_repeticion') {
          if (!rule.hora_inicio.trim()) {
            nextRuleErrors[index].hora_inicio = 'Hora inicio de franja obligatoria.';
          }

          if (!rule.hora_fin.trim()) {
            nextRuleErrors[index].hora_fin = 'Hora fin de franja obligatoria.';
          }

          if (rule.hora_inicio.trim() && rule.hora_fin.trim() && compareTimes(rule.hora_inicio, rule.hora_fin) >= 0) {
            nextRuleErrors[index].hora_fin = 'Hora fin debe ser mayor que hora inicio.';
          }

          if (!canValidateOverlaps) {
            nextFieldErrors.duracion_minutos = 'La duración global es obligatoria para bloques por franja.';
          }
        }

        if (rule.tipo_bloque === 'horas_especificas' && rule.horas_especificas.length === 0) {
          nextRuleErrors[index].horas_especificas = 'Selecciona al menos una hora específica.';
        }
      });

      if (canValidateOverlaps && values.dias_semana.length > 0) {
        const overlapMap = new Map<number, string>();

        values.reglas.forEach((rule, index) => {
          if (!hasRuleContent(rule)) {
            return;
          }

          const starts = computeStartsInMinutes(rule, durationMinutes);
          for (const day of values.dias_semana) {
            const dayNumber = Number(day);
            if (!Number.isInteger(dayNumber) || dayNumber < 0 || dayNumber > 6) {
              continue;
            }

            for (const start of starts) {
              for (let minute = start; minute < start + durationMinutes; minute += 1) {
                const key = dayNumber * 1440 + minute;
                const owner = overlapMap.get(key);
                if (owner && owner !== `${index}`) {
                  nextRuleErrors[index].hora_inicio = 'Este bloque se traslapa con otro bloque en los días seleccionados.';
                  break;
                }
                overlapMap.set(key, `${index}`);
              }
            }
          }
        });
      }
    }

    setFieldErrors(nextFieldErrors);
    setRuleErrors(nextRuleErrors);

    const hasRuleErrors = nextRuleErrors.some((entry) => Object.keys(entry).length > 0);

    return {
      valid: Object.keys(nextFieldErrors).length === 0 && !hasRuleErrors,
      fieldErrors: nextFieldErrors,
      ruleErrors: nextRuleErrors,
    };
  }, []);

  // Categories: computed values
  const totalAsignado = useMemo(() => {
    if (!categoriasForm.enabled) return 0;
    return Object.values(categoriasForm.items).reduce((sum, v) => sum + (v || 0), 0);
  }, [categoriasForm]);

  const cuposSinCategoria = useMemo(() => {
    const max = Number(formValues.cupo_maximo) || 0;
    return Math.max(0, max - totalAsignado);
  }, [formValues.cupo_maximo, totalAsignado]);

  const sumExceedsMax = useMemo(() => {
    if (!categoriasForm.enabled) return false;
    const max = Number(formValues.cupo_maximo) || 0;
    return max > 0 && totalAsignado > max;
  }, [categoriasForm.enabled, formValues.cupo_maximo, totalAsignado]);

  const checkDisciplinaHasNiveles = useCallback(async (disciplinaId: string, tenantId: string) => {
    setCategoriasForm({ enabled: false, items: {} });
    setCategoriasError(null);
    if (!disciplinaId) {
      setDisciplinaHasNiveles(false);
      setActiveNiveles([]);
      return;
    }
    try {
      const niveles = await nivelDisciplinaService.getNivelesDisciplina(tenantId, disciplinaId);
      const active = niveles.filter((n) => n.activo);
      setActiveNiveles(active);
      setDisciplinaHasNiveles(active.length > 0);
    } catch {
      setDisciplinaHasNiveles(false);
      setActiveNiveles([]);
    }
  }, []);

  const toggleCategorias = useCallback((enabled: boolean) => {
    setCategoriasForm((prev) => ({ ...prev, enabled }));
    setCategoriasError(null);
  }, []);

  const updateCategoriasCupos = useCallback((nivelId: string, cupos: number) => {
    setCategoriasForm((prev) => ({
      ...prev,
      items: { ...prev.items, [nivelId]: cupos },
    }));
    setCategoriasError(null);
  }, []);

  // Restriction handlers
  const addRestriccion = useCallback(() => {
    setRestricciones((prev) => [
      ...prev,
      { ...EMPTY_RESTRICCION, orden: prev.length + 1 },
    ]);
  }, []);

  const duplicateRestriccion = useCallback((index: number) => {
    setRestricciones((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const copy = { ...source, orden: prev.length + 1 };
      return [...prev, copy];
    });
  }, []);

  const removeRestriccion = useCallback((index: number) => {
    setRestricciones((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((r, i) => ({ ...r, orden: i + 1 }));
    });
  }, []);

  const updateRestriccion = useCallback(
    (index: number, patch: Partial<EntrenamientoRestriccionInput>) => {
      setRestricciones((prev) =>
        prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const validateCategorias = useCallback((): boolean => {
    if (!categoriasForm.enabled) return true;
    const max = Number(formValues.cupo_maximo) || 0;
    const total = Object.values(categoriasForm.items).reduce((s, v) => s + (v || 0), 0);
    if (max > 0 && total > max) {
      setCategoriasError(`La suma de cupos (${total}) excede la capacidad máxima (${max}).`);
      return false;
    }
    if (total === 0) {
      setCategoriasError('Al menos una categoría debe tener cupos asignados.');
      return false;
    }
    setCategoriasError(null);
    return true;
  }, [categoriasForm, formValues.cupo_maximo]);

  return {
    formValues,
    fieldErrors,
    ruleErrors,
    resetForm,
    setFormValuesFromExternal,
    updateField,
    addRule,
    removeRule,
    updateRuleField,
    validate,
    // Categories
    categoriasForm,
    disciplinaHasNiveles,
    activeNiveles,
    categoriasError,
    totalAsignado,
    cuposSinCategoria,
    sumExceedsMax,
    checkDisciplinaHasNiveles,
    toggleCategorias,
    updateCategoriasCupos,
    validateCategorias,
    // Restrictions
    restricciones,
    reservaAntelacionHoras,
    cancelacionAntelacionHoras,
    setRestricciones,
    setReservaAntelacionHoras,
    setCancelacionAntelacionHoras,
    addRestriccion,
    duplicateRestriccion,
    removeRestriccion,
    updateRestriccion,
  };
}
