'use client';

import { useCallback, useEffect, useState } from 'react';
import { metodosPagoService } from '@/services/supabase/portal/metodos-pago.service';
import type {
  MetodoPago,
  CreateMetodoPagoInput,
  UpdateMetodoPagoInput,
} from '@/types/portal/metodos-pago.types';

type UseMetodosPagoOptions = {
  tenantId: string;
};

type UseMetodosPagoResult = {
  metodos: MetodoPago[];
  loading: boolean;
  error: string | null;
  formOpen: boolean;
  editTarget: MetodoPago | null;
  deleteTarget: MetodoPago | null;
  isSubmitting: boolean;
  openCreate: () => void;
  openEdit: (m: MetodoPago) => void;
  closeForm: () => void;
  submitForm: (data: CreateMetodoPagoInput | UpdateMetodoPagoInput) => Promise<void>;
  openDelete: (m: MetodoPago) => void;
  closeDelete: () => void;
  confirmDelete: () => Promise<void>;
};

export function useMetodosPago({ tenantId }: UseMetodosPagoOptions): UseMetodosPagoResult {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MetodoPago | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetodoPago | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMetodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await metodosPagoService.getMetodosPago(tenantId);
      setMetodos(data);
    } catch {
      setError('No fue posible cargar los métodos de pago.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchMetodos();
  }, [fetchMetodos]);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setError(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((m: MetodoPago) => {
    setEditTarget(m);
    setError(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (isSubmitting) return;
    setFormOpen(false);
    setEditTarget(null);
  }, [isSubmitting]);

  const submitForm = useCallback(
    async (data: CreateMetodoPagoInput | UpdateMetodoPagoInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        if (editTarget) {
          await metodosPagoService.updateMetodoPago(editTarget.id, data as UpdateMetodoPagoInput);
        } else {
          await metodosPagoService.createMetodoPago(data as CreateMetodoPagoInput);
        }
        setFormOpen(false);
        setEditTarget(null);
        await fetchMetodos();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No fue posible guardar el método de pago.';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editTarget, fetchMetodos],
  );

  const openDelete = useCallback((m: MetodoPago) => {
    setDeleteTarget(m);
  }, []);

  const closeDelete = useCallback(() => {
    if (isSubmitting) return;
    setDeleteTarget(null);
  }, [isSubmitting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await metodosPagoService.deleteMetodoPago(deleteTarget.id);
      setDeleteTarget(null);
      await fetchMetodos();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No fue posible eliminar el método de pago.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteTarget, fetchMetodos]);

  return {
    metodos,
    loading,
    error,
    formOpen,
    editTarget,
    deleteTarget,
    isSubmitting,
    openCreate,
    openEdit,
    closeForm,
    submitForm,
    openDelete,
    closeDelete,
    confirmDelete,
  };
}
