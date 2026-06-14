'use client';

import { useCallback, useState } from 'react';
import { entrenamientoPlantillasService } from '@/services/supabase/portal/entrenamiento-plantillas.service';
import {
  EntrenamientoPlantillaServiceError,
  type CreateEntrenamientoPlantillaInput,
  type EntrenamientoPlantilla,
} from '@/types/portal/entrenamiento-plantillas.types';

function mapErrorToMessage(error: unknown, fallback: string): string {
  if (error instanceof EntrenamientoPlantillaServiceError) {
    return error.message;
  }
  return fallback;
}

export function useEntrenamientoPlantillas() {
  const [plantillas, setPlantillas] = useState<EntrenamientoPlantilla[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadPlantillas = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await entrenamientoPlantillasService.list(tenantId);
      setPlantillas(data);
    } catch (caughtError) {
      setError(mapErrorToMessage(caughtError, 'No fue posible cargar las plantillas.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPlantilla = useCallback(async (input: CreateEntrenamientoPlantillaInput): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await entrenamientoPlantillasService.create(input);
      setPlantillas((current) => [created, ...current]);
      return true;
    } catch (caughtError) {
      setSaveError(mapErrorToMessage(caughtError, 'No fue posible guardar la plantilla.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deletePlantilla = useCallback(async (tenantId: string, id: string): Promise<boolean> => {
    try {
      await entrenamientoPlantillasService.delete(tenantId, id);
      setPlantillas((current) => current.filter((plantilla) => plantilla.id !== id));
      return true;
    } catch (caughtError) {
      setError(mapErrorToMessage(caughtError, 'No fue posible eliminar la plantilla.'));
      return false;
    }
  }, []);

  const openListModal = useCallback(() => {
    setIsListModalOpen(true);
  }, []);

  const closeListModal = useCallback(() => {
    setIsListModalOpen(false);
  }, []);

  const openSaveModal = useCallback(() => {
    setSaveError(null);
    setIsSaveModalOpen(true);
  }, []);

  const closeSaveModal = useCallback(() => {
    if (isSaving) return;
    setIsSaveModalOpen(false);
    setSaveError(null);
  }, [isSaving]);

  return {
    plantillas,
    isLoading,
    error,
    isListModalOpen,
    isSaveModalOpen,
    isSaving,
    saveError,
    loadPlantillas,
    createPlantilla,
    deletePlantilla,
    openListModal,
    closeListModal,
    openSaveModal,
    closeSaveModal,
  };
}
