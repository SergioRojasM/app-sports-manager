'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import {
  getPerfil,
  updatePerfil,
  upsertPerfilDeportivo,
} from '@/services/supabase/portal/perfil.service';
import { PerfilServiceError } from '@/types/portal/perfil.types';
import type {
  PerfilDeportivo,
  PerfilFieldErrors,
  PerfilFormField,
  PerfilFormValues,
  PerfilUsuario,
  TipoIdentificacion,
  TipoRH,
} from '@/types/portal/perfil.types';

/* ────────── Helpers ────────── */

function toFormValues(
  usuario: PerfilUsuario,
  deportivo: PerfilDeportivo | null,
): PerfilFormValues {
  return {
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    telefono: usuario.telefono ?? '',
    fecha_nacimiento: usuario.fecha_nacimiento ?? '',
    tipo_identificacion: (usuario.tipo_identificacion as TipoIdentificacion) ?? '',
    numero_identificacion: usuario.numero_identificacion ?? '',
    fecha_exp_identificacion: usuario.fecha_exp_identificacion ?? '',
    rh: (usuario.rh as TipoRH) ?? '',
    peso_kg: deportivo?.peso_kg != null ? String(deportivo.peso_kg) : '',
    altura_cm: deportivo?.altura_cm != null ? String(deportivo.altura_cm) : '',
  };
}

function valuesEqual(a: PerfilFormValues, b: PerfilFormValues): boolean {
  return (Object.keys(a) as PerfilFormField[]).every((k) => a[k] === b[k]);
}

/* ────────── Result type ────────── */

export type UsePerfilResult = {
  loading: boolean;
  error: string | null;
  email: string;
  fotoUrl: string | null;
  formValues: PerfilFormValues;
  fieldErrors: PerfilFieldErrors;
  isSubmitting: boolean;
  isDirty: boolean;
  successMessage: string | null;
  updateField: (field: PerfilFormField, value: string) => void;
  cancel: () => void;
  submit: () => Promise<void>;
  refresh: () => Promise<void>;
};

/* ────────── Hook ────────── */

const EMPTY_FORM: PerfilFormValues = {
  nombre: '',
  apellido: '',
  telefono: '',
  fecha_nacimiento: '',
  tipo_identificacion: '',
  numero_identificacion: '',
  fecha_exp_identificacion: '',
  rh: '',
  peso_kg: '',
  altura_cm: '',
};

export function usePerfil(): UsePerfilResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<PerfilFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<PerfilFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /** Snapshot of the last persisted state — used by cancel() and isDirty */
  const savedSnapshot = useRef<PerfilFormValues>(EMPTY_FORM);

  const isDirty = !valuesEqual(formValues, savedSnapshot.current);

  /* ── Fetch ── */

  const loadPerfil = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { usuario, deportivo } = await getPerfil(uid);
      const values = toFormValues(usuario, deportivo);
      savedSnapshot.current = values;
      setFormValues(values);
      setEmail(usuario.email);
      setFotoUrl(usuario.foto_url ?? null);
    } catch (err) {
      if (err instanceof PerfilServiceError) {
        setError(err.message);
      } else {
        setError('Error al cargar el perfil. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* Resolve auth user on mount, then fetch data */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        loadPerfil(data.user.id);
      } else {
        setLoading(false);
        setError('No se pudo obtener el usuario autenticado.');
      }
    });
  }, [loadPerfil]);

  /* ── refresh (public) ── */

  const refresh = useCallback(async () => {
    if (userId) await loadPerfil(userId);
  }, [userId, loadPerfil]);

  /* ── updateField ── */

  const updateField = useCallback((field: PerfilFormField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /* ── cancel ── */

  const cancel = useCallback(() => {
    setFormValues(savedSnapshot.current);
    setFieldErrors({});
  }, []);

  /* ── submit ── */

  const submit = useCallback(async () => {
    if (!userId) return;

    // Validate required fields
    const errors: PerfilFieldErrors = {};
    if (!formValues.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
    if (!formValues.apellido.trim()) errors.apellido = 'El apellido es obligatorio.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const usuarioPayload: Partial<Omit<PerfilUsuario, 'id' | 'email'>> = {
        nombre: formValues.nombre.trim() || null,
        apellido: formValues.apellido.trim() || null,
        telefono: formValues.telefono.trim() || null,
        fecha_nacimiento: formValues.fecha_nacimiento || null,
        tipo_identificacion: (formValues.tipo_identificacion as TipoIdentificacion) || null,
        numero_identificacion: formValues.numero_identificacion.trim() || null,
        fecha_exp_identificacion: formValues.fecha_exp_identificacion || null,
        rh: formValues.rh || null,
      };

      const deportivoPayload = {
        peso_kg: formValues.peso_kg !== '' ? parseFloat(formValues.peso_kg) : null,
        altura_cm: formValues.altura_cm !== '' ? parseFloat(formValues.altura_cm) : null,
      };

      await Promise.all([
        updatePerfil(userId, usuarioPayload),
        upsertPerfilDeportivo(userId, deportivoPayload),
      ]);

      // Refresh snapshot so isDirty resets
      const updated = { ...formValues };
      savedSnapshot.current = updated;
      setFormValues(updated);

      setSuccessMessage('Perfil actualizado correctamente.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(
        err instanceof PerfilServiceError
          ? err.message
          : 'No se pudo guardar el perfil. Intenta de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, formValues]);

  return {
    loading,
    error,
    email,
    fotoUrl,
    formValues,
    fieldErrors,
    isSubmitting,
    isDirty,
    successMessage,
    updateField,
    cancel,
    submit,
    refresh,
  };
}
