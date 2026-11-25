'use client';

import { useCallback, useEffect, useState } from 'react';
import { nivelDisciplinaService } from '@/services/supabase/portal/nivel-disciplina.service';
import {
  NivelDisciplinaServiceError,
  type NivelDisciplina,
  type CreateNivelDisciplinaInput,
  type UpdateNivelDisciplinaInput,
} from '@/types/portal/nivel-disciplina.types';

type UseNivelesDisciplinaOptions = {
  tenantId: string;
  /** Selected discipline; null while none is selected. */
  disciplinaId: string | null;
  /** Called after a successful mutation, e.g. to refresh the counts of the disciplines list. */
  onChanged?: () => void;
};

export type MoveDirection = 'antes' | 'despues';

type UseNivelesDisciplinaResult = {
  niveles: NivelDisciplina[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  /** Level whose move is being saved. */
  movingId: string | null;
  loadNiveles: () => Promise<void>;
  createNivel: (input: CreateNivelDisciplinaInput) => Promise<boolean>;
  updateNivel: (id: string, input: UpdateNivelDisciplinaInput) => Promise<boolean>;
  deleteNivel: (id: string) => Promise<boolean>;
  moveNivel: (id: string, direction: MoveDirection) => Promise<boolean>;
  clearMessages: () => void;
};

function mapError(err: unknown, fallback: string): string {
  if (err instanceof NivelDisciplinaServiceError) return err.message;
  return fallback;
}

/**
 * Levels of the selected discipline (`fXuVP` ladder). Results are cached per discipline for the
 * page session, so switching back to a discipline does not query again.
 */
export function useNivelesDisciplina({ tenantId, disciplinaId, onChanged }: UseNivelesDisciplinaOptions): UseNivelesDisciplinaResult {
  const [cache, setCache] = useState<Record<string, NivelDisciplina[]>>({});
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchInto = useCallback(
    async (id: string) => {
      try {
        const data = await nivelDisciplinaService.getNivelesDisciplina(tenantId, id);
        setCache((prev) => ({ ...prev, [id]: data }));
        setLoadErrors((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err) {
        setLoadErrors((prev) => ({ ...prev, [id]: mapError(err, 'Error al cargar los niveles.') }));
      }
    },
    [tenantId],
  );

  const cached = disciplinaId ? cache[disciplinaId] : undefined;
  const loadError = disciplinaId ? loadErrors[disciplinaId] : undefined;

  // First visit of a discipline: fetch once (state is only set after the await)
  useEffect(() => {
    if (disciplinaId && cached === undefined && loadError === undefined) {
      void fetchInto(disciplinaId);
    }
  }, [cached, disciplinaId, fetchInto, loadError]);

  const loadNiveles = useCallback(async () => {
    if (disciplinaId) await fetchInto(disciplinaId);
  }, [disciplinaId, fetchInto]);

  const mutate = useCallback(
    async (action: () => Promise<unknown>, success: string, fallback: string): Promise<boolean> => {
      setError(null);
      setSuccessMessage(null);
      try {
        await action();
        setSuccessMessage(success);
        await loadNiveles();
        onChanged?.();
        return true;
      } catch (err) {
        setError(mapError(err, fallback));
        return false;
      }
    },
    [loadNiveles, onChanged],
  );

  const createNivel = useCallback(
    (input: CreateNivelDisciplinaInput) =>
      mutate(() => nivelDisciplinaService.createNivelDisciplina(input), 'Nivel creado exitosamente.', 'Error al crear el nivel.'),
    [mutate],
  );

  const updateNivel = useCallback(
    (id: string, input: UpdateNivelDisciplinaInput) =>
      mutate(
        () => nivelDisciplinaService.updateNivelDisciplina(id, input),
        'Nivel actualizado exitosamente.',
        'Error al actualizar el nivel.',
      ),
    [mutate],
  );

  const deleteNivel = useCallback(
    (id: string) =>
      mutate(() => nivelDisciplinaService.deleteNivelDisciplina(id), 'Nivel eliminado exitosamente.', 'Error al eliminar el nivel.'),
    [mutate],
  );

  /**
   * Swaps `orden` with the neighbouring level. `orden` is unique per discipline and > 0, so the
   * swap goes through a temporary position (max + 1). Any failure reloads the persisted order.
   */
  const moveNivel = useCallback(
    async (id: string, direction: MoveDirection): Promise<boolean> => {
      const list = [...(cached ?? [])].sort((a, b) => a.orden - b.orden);
      const index = list.findIndex((n) => n.id === id);
      const neighbour = list[direction === 'antes' ? index - 1 : index + 1];
      if (index < 0 || !neighbour) return false;
      const current = list[index];
      const temp = Math.max(...list.map((n) => n.orden)) + 1;

      setMovingId(id);
      setError(null);
      setSuccessMessage(null);
      try {
        await nivelDisciplinaService.updateNivelDisciplina(current.id, { orden: temp });
        await nivelDisciplinaService.updateNivelDisciplina(neighbour.id, { orden: current.orden });
        await nivelDisciplinaService.updateNivelDisciplina(current.id, { orden: neighbour.orden });
        await loadNiveles();
        setSuccessMessage('Orden actualizado.');
        return true;
      } catch {
        await loadNiveles();
        setError('No se cambió el orden de los niveles. Inténtalo nuevamente.');
        return false;
      } finally {
        setMovingId(null);
      }
    },
    [cached, loadNiveles],
  );

  return {
    niveles: cached ?? [],
    loading: Boolean(disciplinaId) && cached === undefined && loadError === undefined,
    error: error ?? loadError ?? null,
    successMessage,
    movingId,
    loadNiveles,
    createNivel,
    updateNivel,
    deleteNivel,
    moveNivel,
    clearMessages: () => {
      setError(null);
      setSuccessMessage(null);
    },
  };
}
