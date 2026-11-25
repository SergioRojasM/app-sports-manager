'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FORMULARIO_TIPOS_CAMPO_CON_LISTA_VALORES,
  type FormularioSeccion,
  type FormularioSeccionFormValues,
} from '@/types/portal/formularios.types';

const EMPTY_FORM: FormularioSeccionFormValues = {
  seccion_tipo: 'titulo',
  seccion_descripcion: '',
  seccion_subtitulo: '',
  campo_etiqueta: '',
  campo_tipo: 'texto_corto',
  campo_lista_valores: '',
  campo_placeholder: '',
  campo_obligatorio: false,
  columna_ancho: 'completo',
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
          seccion_subtitulo: initialValues.seccion_subtitulo ?? '',
          campo_etiqueta: initialValues.campo_etiqueta ?? '',
          campo_tipo: initialValues.campo_tipo ?? 'texto_corto',
          campo_lista_valores: initialValues.campo_lista_valores ?? '',
          campo_placeholder: initialValues.campo_placeholder ?? '',
          campo_obligatorio: initialValues.campo_obligatorio,
          columna_ancho: initialValues.columna_ancho,
        }
      : EMPTY_FORM,
  );
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
    if (values.seccion_tipo === 'datos') {
      if (!values.campo_etiqueta.trim()) {
        setFieldError('La etiqueta es obligatoria.');
        return false;
      }
      if (FORMULARIO_TIPOS_CAMPO_CON_LISTA_VALORES.includes(values.campo_tipo) && !values.campo_lista_valores.trim()) {
        setFieldError('Ingresa al menos un valor permitido para este tipo de campo.');
        return false;
      }
      setFieldError(null);
      return true;
    }

    // Separador and the header's badges row carry no editable text through this generic form.
    if (values.seccion_tipo === 'separador' || values.seccion_tipo === 'encabezado_badges') {
      setFieldError(null);
      return true;
    }

    // titulo | subtitulo | texto | seccion | encabezado_titulo | encabezado_subtitulo | encabezado_sobretitulo
    if (!values.seccion_descripcion.trim()) {
      setFieldError(values.seccion_tipo === 'seccion' ? 'El título de la sección es obligatorio.' : 'La descripción es obligatoria.');
      return false;
    }
    setFieldError(null);
    return true;
  }, [values]);

  /** Validates locally, then hands the values to `onSubmit` (now a synchronous local-draft commit — US-0108). */
  const handleSubmit = useCallback(
    (onSubmit: (values: FormularioSeccionFormValues) => void): boolean => {
      if (!validate()) return false;
      onSubmit(values);
      return true;
    },
    [validate, values],
  );

  return {
    values,
    setField,
    fieldError,
    handleSubmit,
  };
}
