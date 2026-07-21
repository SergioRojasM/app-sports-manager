'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormularioCampo, FormularioCampoFormValues } from '@/types/portal/formularios.types';

const CAMPO_NOMBRE_FORMAT = /^[a-z][a-z0-9_]*$/;

function slugifyCampoNombre(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[0-9_]+/, '');
}

function emptyForm(defaultOrden: number): FormularioCampoFormValues {
  return {
    campo_etiqueta: '',
    campo_nombre: '',
    campo_tipo: 'texto_corto',
    campo_lista_valores: '',
    campo_obligatorio: false,
    orden: String(defaultOrden),
  };
}

type UseFormularioCampoFormOptions = {
  initialValues?: FormularioCampo | null;
  defaultOrden?: number;
};

export function useFormularioCampoForm({ initialValues, defaultOrden = 0 }: UseFormularioCampoFormOptions = {}) {
  const isEditMode = Boolean(initialValues);
  const [values, setValues] = useState<FormularioCampoFormValues>(emptyForm(defaultOrden));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const campoNombreManuallyEdited = useRef(false);

  useEffect(() => {
    campoNombreManuallyEdited.current = isEditMode;
    if (initialValues) {
      setValues({
        campo_etiqueta: initialValues.campo_etiqueta,
        campo_nombre: initialValues.campo_nombre,
        campo_tipo: initialValues.campo_tipo,
        campo_lista_valores: initialValues.campo_lista_valores ?? '',
        campo_obligatorio: initialValues.campo_obligatorio,
        orden: String(initialValues.orden),
      });
    } else {
      setValues(emptyForm(defaultOrden));
    }
    setFieldError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const setField = useCallback(
    <K extends keyof FormularioCampoFormValues>(field: K, value: FormularioCampoFormValues[K]) => {
      setValues((prev) => {
        if (field === 'campo_nombre') {
          campoNombreManuallyEdited.current = true;
          return { ...prev, campo_nombre: value as string };
        }

        if (field === 'campo_etiqueta' && !campoNombreManuallyEdited.current) {
          return {
            ...prev,
            campo_etiqueta: value as string,
            campo_nombre: slugifyCampoNombre(value as string),
          };
        }

        return { ...prev, [field]: value };
      });
      setFieldError(null);
    },
    [],
  );

  const reset = useCallback(() => {
    campoNombreManuallyEdited.current = isEditMode;
    setValues(isEditMode && initialValues
      ? {
          campo_etiqueta: initialValues.campo_etiqueta,
          campo_nombre: initialValues.campo_nombre,
          campo_tipo: initialValues.campo_tipo,
          campo_lista_valores: initialValues.campo_lista_valores ?? '',
          campo_obligatorio: initialValues.campo_obligatorio,
          orden: String(initialValues.orden),
        }
      : emptyForm(defaultOrden));
    setFieldError(null);
    setIsSubmitting(false);
  }, [isEditMode, initialValues, defaultOrden]);

  const validate = useCallback((): boolean => {
    if (!values.campo_etiqueta.trim()) {
      setFieldError('La etiqueta es obligatoria.');
      return false;
    }
    if (!values.campo_nombre.trim()) {
      setFieldError('El nombre interno es obligatorio.');
      return false;
    }
    if (!CAMPO_NOMBRE_FORMAT.test(values.campo_nombre.trim())) {
      setFieldError('El nombre interno debe iniciar con una letra y usar solo minúsculas, números y guiones bajos.');
      return false;
    }
    if (values.campo_tipo === 'lista' && !values.campo_lista_valores.trim()) {
      setFieldError('Debes indicar los valores permitidos para un campo de tipo Lista.');
      return false;
    }
    const ordenValue = Number(values.orden);
    if (!Number.isInteger(ordenValue) || ordenValue < 0) {
      setFieldError('El orden debe ser un número entero mayor o igual a 0.');
      return false;
    }
    setFieldError(null);
    return true;
  }, [values]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: FormularioCampoFormValues) => Promise<boolean>): Promise<boolean> => {
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
    isEditMode,
  };
}
