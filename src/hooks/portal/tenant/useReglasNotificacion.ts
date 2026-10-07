'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { reglasNotificacionService } from '@/services/supabase/portal/reglas-notificacion.service';
import {
  ReglaNotificacionServiceError,
  type ReglaNotificacion,
  type ReglaNotificacionCreatePayload,
  type ReglaNotificacionTipo,
  type ReglaNotificacionUpdatePayload,
} from '@/types/portal/reglas-notificacion.types';

type ModalMode = 'create' | 'edit';

type UseReglasNotificacionOptions = {
  tenantId: string;
};

function mensajeError(error: unknown, fallback: string): string {
  return error instanceof ReglaNotificacionServiceError ? error.message : fallback;
}

/**
 * Notification rules of a tenant (US-0135): list, create / edit / delete and the state of the form
 * modal. A failed save keeps the modal open with `submitError`.
 */
export function useReglasNotificacion({ tenantId }: UseReglasNotificacionOptions) {
  const [rules, setRules] = useState<ReglaNotificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedRule, setSelectedRule] = useState<ReglaNotificacion | null>(null);
  // `silent` reloads (after a save) keep the list on screen instead of the loading state
  const [reloadKey, setReloadKey] = useState({ key: 0, silent: false });

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      if (!reloadKey.silent) setIsLoading(true);
      try {
        const data = await reglasNotificacionService.listReglas(tenantId);
        if (cancelled) return;
        setRules(data);
        setError(null);
      } catch (loadError) {
        if (!cancelled) setError(mensajeError(loadError, 'No fue posible cargar las reglas de notificación.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [tenantId, reloadKey]);

  const reload = useCallback(() => setReloadKey((prev) => ({ key: prev.key + 1, silent: false })), []);
  const refresh = useCallback(() => setReloadKey((prev) => ({ key: prev.key + 1, silent: true })), []);

  const conteoPorTipo = useMemo(() => {
    const conteo: Record<ReglaNotificacionTipo, number> = { vencimiento_pre: 0, vencimiento_pos: 0 };
    for (const rule of rules) conteo[rule.tipo] += 1;
    return conteo;
  }, [rules]);

  const openCreateModal = useCallback(() => {
    setSelectedRule(null);
    setModalMode('create');
    setSubmitError(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((rule: ReglaNotificacion) => {
    setSelectedRule(rule);
    setModalMode('edit');
    setSubmitError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSubmitError(null);
  }, [isSubmitting]);

  const guardar = useCallback(
    async (accion: () => Promise<unknown>): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await accion();
        setIsModalOpen(false);
        refresh();
        return true;
      } catch (saveError) {
        setSubmitError(mensajeError(saveError, 'No fue posible guardar la regla. Inténtalo nuevamente.'));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh],
  );

  const handleCreate = useCallback(
    (payload: ReglaNotificacionCreatePayload) => guardar(() => reglasNotificacionService.createRegla(payload)),
    [guardar],
  );

  const handleUpdate = useCallback(
    (id: string, payload: ReglaNotificacionUpdatePayload) =>
      guardar(() => reglasNotificacionService.updateRegla(id, payload)),
    [guardar],
  );

  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await reglasNotificacionService.deleteRegla(id);
        refresh();
        return true;
      } catch (deleteError) {
        setSubmitError(mensajeError(deleteError, 'No fue posible eliminar la regla. Inténtalo nuevamente.'));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh],
  );

  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  return {
    rules,
    conteoPorTipo,
    isLoading,
    isSubmitting,
    error,
    submitError,
    clearSubmitError,
    reload,
    isModalOpen,
    modalMode,
    selectedRule,
    openCreateModal,
    openEditModal,
    closeModal,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
