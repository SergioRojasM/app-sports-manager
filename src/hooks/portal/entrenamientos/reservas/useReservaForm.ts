'use client';

import { useCallback, useState } from 'react';
import { reservasService } from '@/services/supabase/portal/reservas.service';
import type { CreateReservaInput, ReservaEstado, CategoriaDisponibilidad } from '@/types/portal/reservas.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ReservaFormMode = 'create' | 'edit';

type ReservaFormValues = {
  atleta_id: string;
  entrenamiento_categoria_id: string | null;
  notas: string;
  estado: ReservaEstado;
};

type ReservaFormErrors = {
  atleta_id?: string;
  entrenamiento_categoria_id?: string;
  notas?: string;
};

type UseReservaFormOptions = {
  tenantId: string;
  entrenamientoId: string;
  categorias: CategoriaDisponibilidad[];
  disciplinaId: string | null;
  atletaId: string | null;
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
  openCreate: (defaultAtletaId?: string) => Promise<void>;
  openEdit: (reservaId: string, values: Partial<ReservaFormValues>) => void;
  reset: () => void;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const EMPTY_FORM: ReservaFormValues = {
  atleta_id: '',
  entrenamiento_categoria_id: null,
  notas: '',
  estado: 'confirmada',
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useReservaForm({
  tenantId,
  entrenamientoId,
  categorias,
  disciplinaId,
  atletaId,
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

    if (mode === 'create' && categorias.length > 0 && !form.entrenamiento_categoria_id) {
      newErrors.entrenamiento_categoria_id = 'Debes seleccionar un nivel para esta reserva.';
    }

    const hasErrors = Object.keys(newErrors).length > 0;
    setErrors(newErrors);
    return !hasErrors;
  }, [form, mode, categorias]);

  const submitCreate = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const input: CreateReservaInput = {
        tenant_id: tenantId,
        atleta_id: form.atleta_id,
        entrenamiento_id: entrenamientoId,
        entrenamiento_categoria_id: form.entrenamiento_categoria_id ?? undefined,
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

  const openCreate = useCallback(async (defaultAtletaId?: string) => {
    setForm({ ...EMPTY_FORM, atleta_id: defaultAtletaId ?? '' });
    setErrors({});
    setSubmitError(null);
    setMode('create');
    setEditingReservaId(null);

    // Auto-select category based on athlete's discipline level
    const resolvedAtletaId = defaultAtletaId ?? atletaId;
    if (categorias.length > 0 && resolvedAtletaId && disciplinaId) {
      try {
        const nivelId = await reservasService.getAtletaNivelId(tenantId, resolvedAtletaId, disciplinaId);
        if (nivelId) {
          const match = categorias.find((c) => c.nivel_id === nivelId && c.disponible);
          if (match) {
            setForm((prev) => ({ ...prev, entrenamiento_categoria_id: match.id }));
          }
        }
      } catch {
        // Non-critical — user can still select manually
      }
    }
  }, [categorias, disciplinaId, atletaId, tenantId]);

  const openEdit = useCallback((reservaId: string, values: Partial<ReservaFormValues>) => {
    setForm({
      atleta_id: values.atleta_id ?? '',
      entrenamiento_categoria_id: null,
      notas: values.notas ?? '',
      estado: values.estado ?? 'confirmada',
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
