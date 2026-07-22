'use client';

import { useCallback, useState } from 'react';
import type { FormularioPlantillaFormValues } from '@/types/portal/formularios.types';

const EMPTY_FORM: FormularioPlantillaFormValues = {
  nombre: '',
  descripcion: '',
};

export function useFormularioForm() {
  const [values, setValues] = useState<FormularioPlantillaFormValues>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const setField = useCallback(
    <K extends keyof FormularioPlantillaFormValues>(field: K, value: FormularioPlantillaFormValues[K]) => {
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
    if (values.nombre.trim().length > 150) {
      setFieldError('El nombre no puede superar 150 caracteres.');
      return false;
    }
    setFieldError(null);
    return true;
  }, [values.nombre]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: FormularioPlantillaFormValues) => Promise<boolean>): Promise<boolean> => {
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
