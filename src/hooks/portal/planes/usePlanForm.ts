'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  PlanWithDisciplinas,
  PlanFieldErrors,
  PlanFormValues,
  PlanFormField,
  PlanTipoFormValues,
  PlanTipo,
  CreatePlanTipoInput,
  UpdatePlanTipoInput,
} from '@/types/portal/planes.types';

const EMPTY_FORM: PlanFormValues = {
  nombre: '',
  descripcion: '',
  tipo: '',
  beneficios: [],
  activo: true,
  disciplinaIds: [],
};

const EMPTY_TIPO_FORM: PlanTipoFormValues = {
  nombre: '',
  descripcion: '',
  precio: '',
  vigencia_dias: '',
  clases_incluidas: '',
  activo: true,
};

type TipoFormEntry = PlanTipoFormValues & { _id?: string }; // _id = existing DB id

function toFormValues(plan: PlanWithDisciplinas): PlanFormValues {
  return {
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? '',
    tipo: plan.tipo ?? '',
    beneficios: plan.beneficios ? plan.beneficios.split('|').filter(Boolean) : [],
    activo: plan.activo,
    disciplinaIds: [...plan.disciplinas],
  };
}

function planTipoToFormEntry(t: PlanTipo): TipoFormEntry {
  return {
    _id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion ?? '',
    precio: String(t.precio),
    vigencia_dias: String(t.vigencia_dias),
    clases_incluidas: t.clases_incluidas != null ? String(t.clases_incluidas) : '',
    activo: t.activo,
  };
}

export type TiposDiff = {
  toCreate: Omit<CreatePlanTipoInput, 'plan_id' | 'tenant_id'>[];
  toUpdate: { id: string; input: UpdatePlanTipoInput }[];
  toDelete: string[];
};

export type TipoFieldErrors = { index: number; field: string; message: string }[];

export function usePlanForm() {
  const [formValues, setFormValues] = useState<PlanFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<PlanFieldErrors>({});
  const [tiposForm, setTiposForm] = useState<TipoFormEntry[]>([]);
  const [tiposErrors, setTiposErrors] = useState<TipoFieldErrors>([]);
  const [tiposGlobalError, setTiposGlobalError] = useState<string | null>(null);
  const initialTipos = useRef<TipoFormEntry[]>([]);

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setTiposForm([]);
    setTiposErrors([]);
    setTiposGlobalError(null);
    initialTipos.current = [];
  }, []);

  const setFormFromPlan = useCallback((plan: PlanWithDisciplinas) => {
    setFormValues(toFormValues(plan));
    setFieldErrors({});
    const entries = (plan.plan_tipos ?? []).map(planTipoToFormEntry);
    setTiposForm(entries);
    setTiposErrors([]);
    setTiposGlobalError(null);
    initialTipos.current = entries.map((e) => ({ ...e }));
  }, []);

  const updateField = useCallback((field: PlanFormField | 'activo', value: string | boolean | string[]) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as PlanFormField];
      return next;
    });
  }, []);

  // --- Tipos form actions ---

  const addTipo = useCallback(() => {
    setTiposForm((current) => [...current, { ...EMPTY_TIPO_FORM }]);
    setTiposGlobalError(null);
  }, []);

  const updateTipo = useCallback((index: number, values: Partial<PlanTipoFormValues>) => {
    setTiposForm((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...values };
      return next;
    });
    setTiposErrors((current) => current.filter((e) => e.index !== index));
    setTiposGlobalError(null);
  }, []);

  const removeTipo = useCallback((index: number) => {
    setTiposForm((current) => current.filter((_, i) => i !== index));
    setTiposErrors((current) =>
      current
        .filter((e) => e.index !== index)
        .map((e) => (e.index > index ? { ...e, index: e.index - 1 } : e)),
    );
  }, []);

  const setTiposFromPlan = useCallback((plan: PlanWithDisciplinas) => {
    const entries = (plan.plan_tipos ?? []).map(planTipoToFormEntry);
    setTiposForm(entries);
    setTiposErrors([]);
    setTiposGlobalError(null);
    initialTipos.current = entries.map((e) => ({ ...e }));
  }, []);

  // --- Validation ---

  const validate = useCallback((values: PlanFormValues) => {
    const errors: PlanFieldErrors = {};

    const nombre = values.nombre.trim();
    if (!nombre) {
      errors.nombre = 'El nombre es obligatorio.';
    } else if (nombre.length > 100) {
      errors.nombre = 'El nombre no puede superar 100 caracteres.';
    }

    // Validate tipos
    const tErrors: TipoFieldErrors = [];
    let globalTipoError: string | null = null;

    tiposForm.forEach((tipo, i) => {
      const tipoNombre = tipo.nombre.trim();
      if (!tipoNombre) {
        tErrors.push({ index: i, field: 'nombre', message: 'El nombre del subtipo es obligatorio.' });
      }

      const tipoPrecio = parseFloat(tipo.precio);
      if (tipo.precio.trim() === '' || isNaN(tipoPrecio)) {
        tErrors.push({ index: i, field: 'precio', message: 'El precio es obligatorio.' });
      } else if (tipoPrecio < 0) {
        tErrors.push({ index: i, field: 'precio', message: 'El precio debe ser mayor o igual a 0.' });
      }

      const tipoVigencia = parseInt(tipo.vigencia_dias, 10);
      if (tipo.vigencia_dias.trim() === '' || isNaN(tipoVigencia)) {
        tErrors.push({ index: i, field: 'vigencia_dias', message: 'La vigencia es obligatoria.' });
      } else if (tipoVigencia < 1 || !Number.isInteger(tipoVigencia)) {
        tErrors.push({ index: i, field: 'vigencia_dias', message: 'La vigencia debe ser al menos 1 día.' });
      }

      if (tipo.clases_incluidas.trim() !== '') {
        const tipoClases = parseInt(tipo.clases_incluidas, 10);
        if (isNaN(tipoClases) || tipoClases < 0 || !Number.isInteger(tipoClases)) {
          tErrors.push({ index: i, field: 'clases_incluidas', message: 'Debe ser un número entero mayor o igual a 0.' });
        }
      }
    });

    if (tiposForm.length === 0) {
      globalTipoError = 'El plan debe tener al menos un subtipo.';
    } else if (!tiposForm.some((t) => t.activo)) {
      globalTipoError = 'Debe haber al menos un subtipo activo.';
    }

    setFieldErrors(errors);
    setTiposErrors(tErrors);
    setTiposGlobalError(globalTipoError);

    return {
      valid: Object.keys(errors).length === 0 && tErrors.length === 0 && !globalTipoError,
      errors,
    };
  }, [tiposForm]);

  // --- Diff computation ---

  const computeTiposDiff = useCallback((): TiposDiff => {
    const currentIds = new Set(tiposForm.filter((t) => t._id).map((t) => t._id!));
    const initialIds = new Set(initialTipos.current.filter((t) => t._id).map((t) => t._id!));

    const toCreate: TiposDiff['toCreate'] = [];
    const toUpdate: TiposDiff['toUpdate'] = [];
    const toDelete: string[] = [];

    // New entries (no _id)
    for (const entry of tiposForm) {
      if (!entry._id) {
        toCreate.push({
          nombre: entry.nombre.trim(),
          descripcion: entry.descripcion.trim() || null,
          precio: parseFloat(entry.precio),
          vigencia_dias: parseInt(entry.vigencia_dias, 10),
          clases_incluidas: entry.clases_incluidas.trim() !== '' ? parseInt(entry.clases_incluidas, 10) : null,
          activo: entry.activo,
        });
      }
    }

    // Updated entries
    for (const entry of tiposForm) {
      if (!entry._id) continue;
      const original = initialTipos.current.find((t) => t._id === entry._id);
      if (!original) continue;

      const changes: UpdatePlanTipoInput = {};
      if (entry.nombre.trim() !== original.nombre.trim()) changes.nombre = entry.nombre.trim();
      if ((entry.descripcion.trim() || null) !== (original.descripcion.trim() || null)) changes.descripcion = entry.descripcion.trim() || null;
      if (entry.precio !== original.precio) changes.precio = parseFloat(entry.precio);
      if (entry.vigencia_dias !== original.vigencia_dias) changes.vigencia_dias = parseInt(entry.vigencia_dias, 10);
      if (entry.clases_incluidas !== original.clases_incluidas) changes.clases_incluidas = entry.clases_incluidas.trim() !== '' ? parseInt(entry.clases_incluidas, 10) : null;
      if (entry.activo !== original.activo) changes.activo = entry.activo;

      if (Object.keys(changes).length > 0) {
        toUpdate.push({ id: entry._id, input: changes });
      }
    }

    // Deleted entries (in initial but not in current)
    for (const id of initialIds) {
      if (!currentIds.has(id)) {
        toDelete.push(id);
      }
    }

    return { toCreate, toUpdate, toDelete };
  }, [tiposForm]);

  return {
    formValues,
    fieldErrors,
    tiposForm,
    tiposErrors,
    tiposGlobalError,
    resetForm,
    setFormFromPlan,
    updateField,
    addTipo,
    updateTipo,
    removeTipo,
    setTiposFromPlan,
    validate,
    computeTiposDiff,
  };
}
