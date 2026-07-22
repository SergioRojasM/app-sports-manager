'use client';

import { useCallback, useEffect, useState } from 'react';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import {
  FormularioServiceError,
  type FormularioPlantilla,
  type FormularioPlantillaListItem,
  type CreatePlantillaInput,
} from '@/types/portal/formularios.types';

type UseFormulariosOptions = {
  tenantId: string;
};

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
    async (id: string): Promise<boolean> => {
      setDeleteError(null);
      try {
        await formulariosService.deletePlantilla(id);
        await loadPlantillas();
        return true;
      } catch (err) {
        if (err instanceof FormularioServiceError) {
          setDeleteError(err.message);
        } else {
          setDeleteError('No fue posible eliminar la plantilla. Intenta de nuevo.');
        }
        return false;
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
    clearDeleteError,
    refresh: loadPlantillas,
  };
}
