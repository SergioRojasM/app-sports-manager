'use client';

import { useCallback, useEffect, useState } from 'react';
import { reglasSuspensionService } from '@/services/supabase/portal/reglas-suspension.service';
import type {
  ReglaSuspension,
  ReglaSuspensionCreatePayload,
  ReglaSuspensionUpdatePayload,
} from '@/types/portal/reglas-suspension.types';

type ModalMode = 'create' | 'edit';

type UseReglasSuspensionOptions = {
  tenantId: string;
};

type UseReglasSuspensionResult = {
  rules: ReglaSuspension[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  modalMode: ModalMode;
  isModalOpen: boolean;
  selectedRule: ReglaSuspension | null;
  openCreateModal: () => void;
  openEditModal: (rule: ReglaSuspension) => void;
  closeModal: () => void;
  handleCreate: (payload: ReglaSuspensionCreatePayload) => Promise<void>;
  handleUpdate: (id: string, payload: ReglaSuspensionUpdatePayload) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
};

const MAX_RULES = 3;

export function useReglasSuspension({ tenantId }: UseReglasSuspensionOptions): UseReglasSuspensionResult {
  const [rules, setRules] = useState<ReglaSuspension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedRule, setSelectedRule] = useState<ReglaSuspension | null>(null);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reglasSuspensionService.getReglasSuspension(tenantId);
      setRules(data);
    } catch {
      setError('No fue posible cargar las reglas de suspensión.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const openCreateModal = useCallback(() => {
    if (rules.length >= MAX_RULES) return;
    setSelectedRule(null);
    setModalMode('create');
    setError(null);
    setIsModalOpen(true);
  }, [rules.length]);

  const openEditModal = useCallback((rule: ReglaSuspension) => {
    setSelectedRule(rule);
    setModalMode('edit');
    setError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSelectedRule(null);
  }, [isSubmitting]);

  const handleCreate = useCallback(
    async (payload: ReglaSuspensionCreatePayload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await reglasSuspensionService.createReglaSuspension(payload);
        setIsModalOpen(false);
        setSelectedRule(null);
        await fetchRules();
      } catch (err: unknown) {
        const pgError = err as { code?: string; message?: string };
        if (pgError.code === '23505') {
          throw err;
        }
        const message =
          err instanceof Error ? err.message : 'No fue posible crear la regla de suspensión.';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchRules],
  );

  const handleUpdate = useCallback(
    async (id: string, payload: ReglaSuspensionUpdatePayload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await reglasSuspensionService.updateReglaSuspension(id, payload);
        setIsModalOpen(false);
        setSelectedRule(null);
        await fetchRules();
      } catch (err: unknown) {
        const pgError = err as { code?: string; message?: string };
        if (pgError.code === '23505') {
          throw err;
        }
        const message =
          err instanceof Error ? err.message : 'No fue posible actualizar la regla de suspensión.';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchRules],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await reglasSuspensionService.deleteReglaSuspension(id);
        await fetchRules();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No fue posible eliminar la regla de suspensión.';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchRules],
  );

  return {
    rules,
    isLoading,
    isSubmitting,
    error,
    modalMode,
    isModalOpen,
    selectedRule,
    openCreateModal,
    openEditModal,
    closeModal,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
