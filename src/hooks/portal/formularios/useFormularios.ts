'use client';

import { useCallback, useEffect, useState } from 'react';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import { entrenamientosService } from '@/services/supabase/portal/entrenamientos.service';
import {
  FormularioServiceError,
  type FormularioPlantilla,
  type FormularioPlantillaListItem,
  type FormularioServiceErrorCode,
  type CreatePlantillaInput,
} from '@/types/portal/formularios.types';

type UseFormulariosOptions = {
  tenantId: string;
};

export type DeletePlantillaResult =
  | { ok: true }
  | { ok: false; code: FormularioServiceErrorCode; message: string };

export function useFormularios({ tenantId }: UseFormulariosOptions) {
  const [plantillas, setPlantillas] = useState<FormularioPlantillaListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadPlantillas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await formulariosService.getPlantillasByTenant(tenantId);
      setPlantillas(data);
    } catch {
      setError('No fue posible cargar las plantillas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadPlantillas();
  }, [loadPlantillas]);

  const openCreateModal = useCallback(() => {
    setSubmitError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSubmitError(null);
  }, []);

  const createPlantilla = useCallback(async (input: CreatePlantillaInput): Promise<FormularioPlantilla | null> => {
    setSubmitError(null);
    try {
      const created = await formulariosService.createPlantilla(input);
      setIsModalOpen(false);
      return created;
    } catch (err) {
      if (err instanceof FormularioServiceError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('No fue posible crear la plantilla. Intenta de nuevo.');
      }
      return null;
    }
  }, []);

  const deletePlantilla = useCallback(
    async (id: string): Promise<DeletePlantillaResult> => {
      setDeleteError(null);
      try {
        await formulariosService.deletePlantilla(id);
        await loadPlantillas();
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof FormularioServiceError ? err.message : 'No fue posible eliminar la plantilla. Intenta de nuevo.';
        const code: FormularioServiceErrorCode = err instanceof FormularioServiceError ? err.code : 'unknown';
        setDeleteError(message);
        return { ok: false, code, message };
      }
    },
    [loadPlantillas],
  );

  /**
   * Detaches this plantilla from every training that references it (formulario_id ->
   * null, formulario_obligatorio -> false), then deletes it. Used as the "delete anyway"
   * follow-up when deletePlantilla fails with code 'in_use'.
   */
  const forceDeletePlantilla = useCallback(
    async (id: string): Promise<DeletePlantillaResult> => {
      setDeleteError(null);
      try {
        await entrenamientosService.detachFormularioPlantilla(id);
        await formulariosService.deletePlantilla(id);
        await loadPlantillas();
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof FormularioServiceError || err instanceof Error
            ? err.message
            : 'No fue posible eliminar la plantilla. Intenta de nuevo.';
        const code: FormularioServiceErrorCode = err instanceof FormularioServiceError ? err.code : 'unknown';
        setDeleteError(message);
        return { ok: false, code, message };
      }
    },
    [loadPlantillas],
  );

  const clearDeleteError = useCallback(() => setDeleteError(null), []);

  return {
    plantillas,
    isLoading,
    error,
    isModalOpen,
    submitError,
    deleteError,
    openCreateModal,
    closeModal,
    createPlantilla,
    deletePlantilla,
    forceDeletePlantilla,
    clearDeleteError,
    refresh: loadPlantillas,
  };
}
