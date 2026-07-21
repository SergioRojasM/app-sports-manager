'use client';

import { useCallback, useEffect, useState } from 'react';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import {
  FormularioServiceError,
  type FormularioPlantilla,
  type FormularioPlantillaListItem,
  type CreatePlantillaInput,
  type UpdatePlantillaInput,
} from '@/types/portal/formularios.types';

type UseFormulariosOptions = {
  tenantId: string;
};

export function useFormularios({ tenantId }: UseFormulariosOptions) {
  const [plantillas, setPlantillas] = useState<FormularioPlantillaListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<FormularioPlantilla | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    setEditingPlantilla(null);
    setSubmitError(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((plantilla: FormularioPlantilla) => {
    setEditingPlantilla(plantilla);
    setSubmitError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPlantilla(null);
    setSubmitError(null);
  }, []);

  const createPlantilla = useCallback(
    async (input: CreatePlantillaInput): Promise<boolean> => {
      setSubmitError(null);
      try {
        await formulariosService.createPlantilla(input);
        await loadPlantillas();
        setSuccessMessage('Plantilla creada exitosamente.');
        setTimeout(() => setSuccessMessage(null), 4000);
        return true;
      } catch (err) {
        if (err instanceof FormularioServiceError) {
          setSubmitError(err.message);
        } else {
          setSubmitError('No fue posible crear la plantilla. Intenta de nuevo.');
        }
        return false;
      }
    },
    [loadPlantillas],
  );

  const updatePlantilla = useCallback(
    async (id: string, input: UpdatePlantillaInput): Promise<boolean> => {
      setSubmitError(null);
      try {
        await formulariosService.updatePlantilla(id, input);
        await loadPlantillas();
        setSuccessMessage('Plantilla actualizada exitosamente.');
        setTimeout(() => setSuccessMessage(null), 4000);
        return true;
      } catch (err) {
        if (err instanceof FormularioServiceError) {
          setSubmitError(err.message);
        } else {
          setSubmitError('No fue posible actualizar la plantilla. Intenta de nuevo.');
        }
        return false;
      }
    },
    [loadPlantillas],
  );

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
    editingPlantilla,
    submitError,
    successMessage,
    deleteError,
    openCreateModal,
    openEditModal,
    closeModal,
    createPlantilla,
    updatePlantilla,
    deletePlantilla,
    clearDeleteError,
    refresh: loadPlantillas,
  };
}
