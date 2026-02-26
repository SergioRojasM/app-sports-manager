'use client';

import { useCallback, useState } from 'react';
import type {
  Discipline,
  DisciplineFieldErrors,
  DisciplineFormValues,
} from '@/types/portal/disciplines.types';

const EMPTY_FORM: DisciplineFormValues = {
  nombre: '',
  descripcion: '',
  activo: true,
};

function toFormValues(discipline: Discipline): DisciplineFormValues {
  return {
    nombre: discipline.nombre,
    descripcion: discipline.descripcion ?? '',
    activo: discipline.activo,
  };
}

export function useDisciplineForm() {
  const [formValues, setFormValues] = useState<DisciplineFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<DisciplineFieldErrors>({});

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
  }, []);

  const setFormFromDiscipline = useCallback((discipline: Discipline) => {
    setFormValues(toFormValues(discipline));
    setFieldErrors({});
  }, []);

  const updateField = useCallback((field: keyof DisciplineFormValues, value: string | boolean) => {
    setFormValues((current) => ({ ...current, [field]: value }) as DisciplineFormValues);
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as keyof DisciplineFieldErrors];
      return next;
    });
  }, []);

  const validate = useCallback((values: DisciplineFormValues) => {
    const errors: DisciplineFieldErrors = {};

    const nombre = values.nombre.trim();
    if (!nombre) {
      errors.nombre = 'El nombre es obligatorio.';
    } else if (nombre.length > 100) {
      errors.nombre = 'El nombre no puede superar 100 caracteres.';
    }

    if (values.descripcion.trim().length > 2000) {
      errors.descripcion = 'La descripción no puede superar 2000 caracteres.';
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
    setFormFromDiscipline,
    updateField,
    validate,
  };
}