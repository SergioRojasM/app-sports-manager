'use client';

import { useCallback, useState } from 'react';
import type {
  PlanWithDisciplinas,
  PlanFieldErrors,
  PlanFormValues,
  PlanFormField,
} from '@/types/portal/planes.types';

const EMPTY_FORM: PlanFormValues = {
  nombre: '',
  descripcion: '',
  precio: '',
  vigencia_meses: '1',
  activo: true,
  disciplinaIds: [],
};

function toFormValues(plan: PlanWithDisciplinas): PlanFormValues {
  return {
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? '',
    precio: String(plan.precio),
    vigencia_meses: String(plan.vigencia_meses),
    activo: plan.activo,
    disciplinaIds: [...plan.disciplinas],
  };
}

export function usePlanForm() {
  const [formValues, setFormValues] = useState<PlanFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<PlanFieldErrors>({});

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
  }, []);

  const setFormFromPlan = useCallback((plan: PlanWithDisciplinas) => {
    setFormValues(toFormValues(plan));
    setFieldErrors({});
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

  const validate = useCallback((values: PlanFormValues) => {
    const errors: PlanFieldErrors = {};

    const nombre = values.nombre.trim();
    if (!nombre) {
      errors.nombre = 'El nombre es obligatorio.';
    } else if (nombre.length > 100) {
      errors.nombre = 'El nombre no puede superar 100 caracteres.';
    }

    const precio = parseFloat(values.precio);
    if (values.precio.trim() === '' || isNaN(precio)) {
      errors.precio = 'El precio es obligatorio.';
    } else if (precio < 0) {
      errors.precio = 'El precio debe ser mayor o igual a 0.';
    }

    const vigencia = parseInt(values.vigencia_meses, 10);
    if (values.vigencia_meses.trim() === '' || isNaN(vigencia)) {
      errors.vigencia_meses = 'La vigencia es obligatoria.';
    } else if (vigencia < 1 || !Number.isInteger(vigencia)) {
      errors.vigencia_meses = 'La vigencia debe ser un número entero mayor o igual a 1.';
    }

    if (values.disciplinaIds.length === 0) {
      errors.disciplinaIds = 'Debe seleccionar al menos una disciplina.';
    }

    setFieldErrors(errors);
    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, []);

  return {
    formValues,
    fieldErrors,
    resetForm,
    setFormFromPlan,
    updateField,
    validate,
  };
}
