'use client';

import { useCallback, useState } from 'react';
import { nivelDisciplinaService } from '@/services/supabase/portal/nivel-disciplina.service';
import {
  NivelDisciplinaServiceError,
  type NivelDisciplina,
  type CreateNivelDisciplinaInput,
  type UpdateNivelDisciplinaInput,
} from '@/types/portal/nivel-disciplina.types';

type UseNivelesDisciplinaOptions = {
  tenantId: string;
  disciplinaId: string;
};

type UseNivelesDisciplinaResult = {
  niveles: NivelDisciplina[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  loadNiveles: () => Promise<void>;
  createNivel: (input: CreateNivelDisciplinaInput) => Promise<boolean>;
  updateNivel: (id: string, input: UpdateNivelDisciplinaInput) => Promise<boolean>;
  deleteNivel: (id: string) => Promise<boolean>;
};

function mapError(err: unknown, fallback: string): string {
  if (err instanceof NivelDisciplinaServiceError) return err.message;
  return fallback;
}

export function useNivelesDisciplina({ tenantId, disciplinaId }: UseNivelesDisciplinaOptions): UseNivelesDisciplinaResult {
  const [niveles, setNiveles] = useState<NivelDisciplina[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadNiveles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nivelDisciplinaService.getNivelesDisciplina(tenantId, disciplinaId);
      setNiveles(data);
    } catch (err) {
      setError(mapError(err, 'Error al cargar los niveles.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, disciplinaId]);

  const createNivel = useCallback(async (input: CreateNivelDisciplinaInput): Promise<boolean> => {
    setError(null);
    setSuccessMessage(null);
    try {
      await nivelDisciplinaService.createNivelDisciplina(input);
      setSuccessMessage('Nivel creado exitosamente.');
      await loadNiveles();
      return true;
    } catch (err) {
      setError(mapError(err, 'Error al crear el nivel.'));
      return false;
    }
  }, [loadNiveles]);

  const updateNivel = useCallback(async (id: string, input: UpdateNivelDisciplinaInput): Promise<boolean> => {
    setError(null);
    setSuccessMessage(null);
    try {
      await nivelDisciplinaService.updateNivelDisciplina(id, input);
      setSuccessMessage('Nivel actualizado exitosamente.');
      await loadNiveles();
      return true;
    } catch (err) {
      setError(mapError(err, 'Error al actualizar el nivel.'));
      return false;
    }
  }, [loadNiveles]);

  const deleteNivel = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    setSuccessMessage(null);
    try {
      await nivelDisciplinaService.deleteNivelDisciplina(id);
      setSuccessMessage('Nivel eliminado exitosamente.');
      await loadNiveles();
      return true;
    } catch (err) {
      setError(mapError(err, 'Error al eliminar el nivel.'));
      return false;
    }
  }, [loadNiveles]);

  return {
    niveles,
    loading,
    error,
    successMessage,
    loadNiveles,
    createNivel,
    updateNivel,
    deleteNivel,
  };
}
