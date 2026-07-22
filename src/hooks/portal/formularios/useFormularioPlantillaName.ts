'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';

/**
 * Fetches only the `nombre` field of a form template.
 * Returns null while loading or if plantillaId is not provided.
 */
export function useFormularioPlantillaName(plantillaId?: string): string | null {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!plantillaId) {
      setName(null);
      return;
    }

    let cancelled = false;

    supabase
      .from('formularios_plantillas')
      .select('nombre')
      .eq('id', plantillaId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) {
          setName((data as { nombre: string }).nombre);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, plantillaId]);

  return name;
}
