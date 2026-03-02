'use client';

import { useCallback, useState } from 'react';
import type { CreateReservaInput, ReservaEstado } from '@/types/portal/reservas.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ReservaFormMode = 'create' | 'edit';

type ReservaFormValues = {
  atleta_id: string;
  notas: string;
  estado: ReservaEstado;
};

type ReservaFormErrors = {
  atleta_id?: string;
  notas?: string;
};

type UseReservaFormOptions = {
  tenantId: string;
  entrenamientoId: string;
  onCreateReserva: (input: CreateReservaInput) => Promise<boolean>;
  onUpdateReserva: (id: string, input: { estado?: ReservaEstado; notas?: string }) => Promise<boolean>;
};

type UseReservaFormResult = {
  form: ReservaFormValues;
  errors: ReservaFormErrors;
  mode: ReservaFormMode;
  editingReservaId: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  updateField: (field: keyof ReservaFormValues, value: string) => void;
  submitCreate: () => Promise<boolean>;
  submitUpdate: () => Promise<boolean>;
  openCreate: (defaultAtletaId?: string) => void;
  openEdit: (reservaId: string, values: Partial<ReservaFormValues>) => void;
  reset: () => void;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const EMPTY_FORM: ReservaFormValues = {
  atleta_id: '',
  notas: '',
  estado: 'pendiente',
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useReservaForm({
  tenantId,
  entrenamientoId,
  onCreateReserva,
  onUpdateReserva,
}: UseReservaFormOptions): UseReservaFormResult {
  const [form, setForm] = useState<ReservaFormValues>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<ReservaFormErrors>({});
  const [mode, setMode] = useState<ReservaFormMode>('create');
  const [editingReservaId, setEditingReservaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = useCallback((field: keyof ReservaFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: ReservaFormErrors = {};

    if (mode === 'create' && !form.atleta_id.trim()) {
      newErrors.atleta_id = 'Debes seleccionar un atleta.';
    }

    const hasErrors = Object.keys(newErrors).length > 0;
    setErrors(newErrors);
    return !hasErrors;
  }, [form, mode]);

  const submitCreate = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const input: CreateReservaInput = {
        tenant_id: tenantId,
        atleta_id: form.atleta_id,
        entrenamiento_id: entrenamientoId,
        notas: form.notas.trim() || undefined,
      };

      const success = await onCreateReserva(input);
      if (success) {
        setForm({ ...EMPTY_FORM });
      }
      return success;
    } catch {
      setSubmitError('No fue posible crear la reserva.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, tenantId, entrenamientoId, form, onCreateReserva]);

  const submitUpdate = useCallback(async (): Promise<boolean> => {
    if (!editingReservaId) return false;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const success = await onUpdateReserva(editingReservaId, {
        estado: form.estado,
        notas: form.notas,
      });

      if (success) {
        setEditingReservaId(null);
        setForm({ ...EMPTY_FORM });
        setMode('create');
      }

      return success;
    } catch {
      setSubmitError('No fue posible actualizar la reserva.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingReservaId, form, onUpdateReserva]);

  const openCreate = useCallback((defaultAtletaId?: string) => {
    setForm({ ...EMPTY_FORM, atleta_id: defaultAtletaId ?? '' });
    setErrors({});
    setSubmitError(null);
    setMode('create');
    setEditingReservaId(null);
  }, []);

  const openEdit = useCallback((reservaId: string, values: Partial<ReservaFormValues>) => {
    setForm({
      atleta_id: values.atleta_id ?? '',
      notas: values.notas ?? '',
      estado: values.estado ?? 'pendiente',
    });
    setErrors({});
    setSubmitError(null);
    setMode('edit');
    setEditingReservaId(reservaId);
  }, []);

  const reset = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setSubmitError(null);
    setMode('create');
    setEditingReservaId(null);
    setIsSubmitting(false);
  }, []);

  return {
    form,
    errors,
    mode,
    editingReservaId,
    isSubmitting,
    submitError,
    updateField,
    submitCreate,
    submitUpdate,
    openCreate,
    openEdit,
    reset,
  };
}
