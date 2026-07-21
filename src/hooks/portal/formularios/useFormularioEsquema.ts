'use client';

import { useCallback, useState } from 'react';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import {
  FormularioServiceError,
  type FormularioCampo,
  type CreateCampoInput,
  type UpdateCampoInput,
} from '@/types/portal/formularios.types';

type UseFormularioEsquemaOptions = {
  plantillaId: string;
};

function mapError(err: unknown, fallback: string): string {
  if (err instanceof FormularioServiceError) return err.message;
  return fallback;
}

export function useFormularioEsquema({ plantillaId }: UseFormularioEsquemaOptions) {
  const [campos, setCampos] = useState<FormularioCampo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCampos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await formulariosService.getCamposByPlantilla(plantillaId);
      setCampos(data);
    } catch (err) {
      setError(mapError(err, 'Error al cargar los campos.'));
    } finally {
      setLoading(false);
    }
  }, [plantillaId]);

  const createCampo = useCallback(
    async (input: CreateCampoInput): Promise<boolean> => {
      setError(null);
      setSuccessMessage(null);
      try {
        await formulariosService.createCampo(input);
        setSuccessMessage('Campo creado exitosamente.');
        await loadCampos();
        return true;
      } catch (err) {
        setError(mapError(err, 'Error al crear el campo.'));
        return false;
      }
    },
    [loadCampos],
  );

  const updateCampo = useCallback(
    async (id: string, input: UpdateCampoInput): Promise<boolean> => {
      setError(null);
      setSuccessMessage(null);
      try {
        await formulariosService.updateCampo(id, input);
        setSuccessMessage('Campo actualizado exitosamente.');
        await loadCampos();
        return true;
      } catch (err) {
        setError(mapError(err, 'Error al actualizar el campo.'));
        return false;
      }
    },
    [loadCampos],
  );

  const deleteCampo = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      setSuccessMessage(null);
      try {
        await formulariosService.deleteCampo(id);
        setSuccessMessage('Campo eliminado exitosamente.');
        await loadCampos();
        return true;
      } catch (err) {
        setError(mapError(err, 'Error al eliminar el campo.'));
        return false;
      }
    },
    [loadCampos],
  );

  const reorderCampos = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      setError(null);
      try {
        await formulariosService.reorderCampos(plantillaId, orderedIds);
        await loadCampos();
        return true;
      } catch (err) {
        setError(mapError(err, 'Error al reordenar los campos.'));
        return false;
      }
    },
    [plantillaId, loadCampos],
  );

  return {
    campos,
    loading,
    error,
    successMessage,
    loadCampos,
    createCampo,
    updateCampo,
    deleteCampo,
    reorderCampos,
  };
}
