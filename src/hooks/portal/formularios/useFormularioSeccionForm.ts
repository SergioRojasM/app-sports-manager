'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormularioSeccion, FormularioSeccionFormValues } from '@/types/portal/formularios.types';

const EMPTY_FORM: FormularioSeccionFormValues = {
  seccion_tipo: 'titulo',
  seccion_descripcion: '',
  campo_etiqueta: '',
  campo_tipo: 'texto_corto',
  campo_lista_valores: '',
  campo_placeholder: '',
  campo_obligatorio: false,
};

type UseFormularioSeccionFormOptions = {
  initialValues?: FormularioSeccion | null;
};

export function useFormularioSeccionForm({ initialValues }: UseFormularioSeccionFormOptions = {}) {
  const [values, setValues] = useState<FormularioSeccionFormValues>(() =>
    initialValues
      ? {
          seccion_tipo: initialValues.seccion_tipo,
          seccion_descripcion: initialValues.seccion_descripcion ?? '',
          campo_etiqueta: initialValues.campo_etiqueta ?? '',
          campo_tipo: initialValues.campo_tipo ?? 'texto_corto',
          campo_lista_valores: initialValues.campo_lista_valores ?? '',
          campo_placeholder: initialValues.campo_placeholder ?? '',
          campo_obligatorio: initialValues.campo_obligatorio,
        }
      : EMPTY_FORM,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setFieldError(null);
  }, [values.seccion_tipo]);

  const setField = useCallback(
    <K extends keyof FormularioSeccionFormValues>(field: K, value: FormularioSeccionFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setFieldError(null);
    },
    [],
  );

  const validate = useCallback((): boolean => {
    if (values.seccion_tipo !== 'datos') {
      if (!values.seccion_descripcion.trim()) {
        setFieldError('La descripción es obligatoria.');
        return false;
      }
      setFieldError(null);
      return true;
    }

    if (!values.campo_etiqueta.trim()) {
      setFieldError('La etiqueta es obligatoria.');
      return false;
    }
    if (values.campo_tipo === 'lista' && !values.campo_lista_valores.trim()) {
      setFieldError('Ingresa al menos un valor permitido para el tipo Lista.');
      return false;
    }
    setFieldError(null);
    return true;
  }, [values]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: FormularioSeccionFormValues) => Promise<boolean>): Promise<boolean> => {
      if (!validate()) return false;
      setIsSubmitting(true);
      try {
        return await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, values],
  );

  return {
    values,
    setField,
    isSubmitting,
    fieldError,
    handleSubmit,
  };
}
