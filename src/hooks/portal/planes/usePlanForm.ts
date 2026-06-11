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
import type { PlanTipoServicioRow } from '@/types/portal/servicios.types';

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
    activo: t.activo,
  };
}

export type TiposDiff = {
  toCreate: (Omit<CreatePlanTipoInput, 'plan_id' | 'tenant_id'> & { servicios: PlanTipoServicioRow[] })[];
  toUpdate: { id: string; input: UpdatePlanTipoInput & { servicios: PlanTipoServicioRow[] } }[];
  toDelete: string[];
};

export type TipoFieldErrors = { index: number; field: string; message: string }[];

export function usePlanForm() {
  const [formValues, setFormValues] = useState<PlanFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<PlanFieldErrors>({});
  const [tiposForm, setTiposForm] = useState<TipoFormEntry[]>([]);
  const [tiposErrors, setTiposErrors] = useState<TipoFieldErrors>([]);
  const [tiposGlobalError, setTiposGlobalError] = useState<string | null>(null);
  // Parallel array of service rows per tipo (same index as tiposForm)
  const [tiposServiceRows, setTiposServiceRows] = useState<PlanTipoServicioRow[][]>([]);
  const initialTipos = useRef<TipoFormEntry[]>([]);

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setTiposForm([]);
    setTiposErrors([]);
    setTiposGlobalError(null);
    setTiposServiceRows([]);
    initialTipos.current = [];
  }, []);

  const setFormFromPlan = useCallback((plan: PlanWithDisciplinas) => {
    setFormValues(toFormValues(plan));
    setFieldErrors({});
    const entries = (plan.plan_tipos ?? []).map(planTipoToFormEntry);
    setTiposForm(entries);
    setTiposErrors([]);
    setTiposGlobalError(null);
    // Pre-fill service rows from plan_tipos.servicios if available
    setTiposServiceRows(entries.map((_, i) => (plan.plan_tipos ?? [])[i]?.servicios ?? []));
    initialTipos.current = entries.map((e) => ({ ...e }));
  }, []);

  const setFormForDuplicate = useCallback((plan: PlanWithDisciplinas) => {
    const duplicateName = 'Copia de ' + plan.nombre.slice(0, 91);
    setFormValues({ ...toFormValues(plan), nombre: duplicateName });
    setFieldErrors({});
    // Strip _id so computeTiposDiff treats every entry as toCreate
    const entries = (plan.plan_tipos ?? [])
      .map(planTipoToFormEntry)
      .map(({ _id: _stripped, ...rest }) => rest as TipoFormEntry);
    setTiposForm(entries);
    setTiposErrors([]);
    setTiposGlobalError(null);
    setTiposServiceRows(entries.map((_, i) => (plan.plan_tipos ?? [])[i]?.servicios ?? []));
    initialTipos.current = [];
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
    setTiposServiceRows((current) => [...current, []]);
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
    setTiposServiceRows((current) => current.filter((_, i) => i !== index));
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
    setTiposServiceRows(entries.map((_, i) => (plan.plan_tipos ?? [])[i]?.servicios ?? []));
    initialTipos.current = entries.map((e) => ({ ...e }));
  }, []);

  /** Update service rows for a specific tipo index */
  const updateTipoServiceRows = useCallback((index: number, rows: PlanTipoServicioRow[]) => {
    setTiposServiceRows((current) => {
      const next = [...current];
      next[index] = rows;
      return next;
    });
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
    for (let i = 0; i < tiposForm.length; i++) {
      const entry = tiposForm[i];
      if (!entry._id) {
        toCreate.push({
          nombre: entry.nombre.trim(),
          descripcion: entry.descripcion.trim() || null,
          precio: parseFloat(entry.precio),
          vigencia_dias: parseInt(entry.vigencia_dias, 10),
          activo: entry.activo,
          servicios: tiposServiceRows[i] ?? [],
        });
      }
    }

    // Updated entries
    for (let i = 0; i < tiposForm.length; i++) {
      const entry = tiposForm[i];
      if (!entry._id) continue;
      const original = initialTipos.current.find((t) => t._id === entry._id);
      if (!original) continue;

      const changes: UpdatePlanTipoInput = {};
      if (entry.nombre.trim() !== original.nombre.trim()) changes.nombre = entry.nombre.trim();
      if ((entry.descripcion.trim() || null) !== (original.descripcion.trim() || null)) changes.descripcion = entry.descripcion.trim() || null;
      if (entry.precio !== original.precio) changes.precio = parseFloat(entry.precio);
      if (entry.vigencia_dias !== original.vigencia_dias) changes.vigencia_dias = parseInt(entry.vigencia_dias, 10);
      if (entry.activo !== original.activo) changes.activo = entry.activo;

      // Always include servicios for existing types (sync ensures current state is persisted)
      toUpdate.push({ id: entry._id, input: { ...changes, servicios: tiposServiceRows[i] ?? [] } });
    }

    // Deleted entries (in initial but not in current)
    for (const id of initialIds) {
      if (!currentIds.has(id)) {
        toDelete.push(id);
      }
    }

    return { toCreate, toUpdate, toDelete };
  }, [tiposForm, tiposServiceRows]);

  return {
    formValues,
    fieldErrors,
    tiposForm,
    tiposErrors,
    tiposGlobalError,
    tiposServiceRows,
    resetForm,
    setFormFromPlan,
    setFormForDuplicate,
    updateField,
    addTipo,
    updateTipo,
    removeTipo,
    updateTipoServiceRows,
    setTiposFromPlan,
    validate,
    computeTiposDiff,
  };
}
