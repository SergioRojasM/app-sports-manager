'use client';

import { useCallback, useEffect, useState } from 'react';
import { entrenamientoCategoriasService } from '@/services/supabase/portal/entrenamiento-categorias.service';
import type { EntrenamientoCategoria } from '@/types/portal/entrenamiento-categorias.types';

type UseEntrenamientoCategoriasOptions = {
  entrenamientoId: string | null;
};

type UseEntrenamientoCategoriasResult = {
  categorias: EntrenamientoCategoria[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useEntrenamientoCategorias({ entrenamientoId }: UseEntrenamientoCategoriasOptions): UseEntrenamientoCategoriasResult {
  const [categorias, setCategorias] = useState<EntrenamientoCategoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategorias = useCallback(async () => {
    if (!entrenamientoId) {
      setCategorias([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await entrenamientoCategoriasService.getEntrenamientoCategorias(entrenamientoId);
      setCategorias(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías.');
    } finally {
      setLoading(false);
    }
  }, [entrenamientoId]);

  useEffect(() => {
    void loadCategorias();
  }, [loadCategorias]);

  return {
    categorias,
    loading,
    error,
    refresh: loadCategorias,
  };
}
