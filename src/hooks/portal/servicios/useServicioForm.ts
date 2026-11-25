'use client';

import { useCallback, useState } from 'react';
import type { Servicio, ServicioFormValues } from '@/types/portal/servicios.types';

const EMPTY_FORM: ServicioFormValues = {
  nombre: '',
  descripcion: '',
  activo: true,
};

type UseServicioFormOptions = {
  initialValues?: Servicio | null;
};

export function useServicioForm({ initialValues }: UseServicioFormOptions = {}) {
  // The form is mounted per opening (keyed), so it starts from `initialValues` without a reset effect
  const [values, setValues] = useState<ServicioFormValues>(() =>
    initialValues
      ? { nombre: initialValues.nombre, descripcion: initialValues.descripcion ?? '', activo: initialValues.activo }
      : EMPTY_FORM,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const setField = useCallback(
    <K extends keyof ServicioFormValues>(field: K, value: ServicioFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (field === 'nombre') setFieldError(null);
    },
    [],
  );

  const reset = useCallback(() => {
    setValues(EMPTY_FORM);
    setFieldError(null);
    setIsSubmitting(false);
  }, []);

  const validate = useCallback((): boolean => {
    if (!values.nombre.trim()) {
      setFieldError('El nombre es obligatorio.');
      return false;
    }
    if (values.nombre.trim().length > 100) {
      setFieldError('El nombre no puede superar 100 caracteres.');
      return false;
    }
    setFieldError(null);
    return true;
  }, [values.nombre]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: ServicioFormValues) => Promise<boolean>): Promise<boolean> => {
      if (!validate()) return false;
      setIsSubmitting(true);
      try {
        const success = await onSubmit(values);
        return success;
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, values],
  );

  return {
    values,
    setField,
    reset,
    isSubmitting,
    fieldError,
    handleSubmit,
  };
}
