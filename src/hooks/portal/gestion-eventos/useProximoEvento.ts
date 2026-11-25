'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { pickProximoEvento } from '@/lib/portal/proximo-evento';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import type { ResumenIngresos } from '@/types/portal/eventos-compras.types';
import type { EventoListItem } from '@/types/portal/eventos.types';

type UseProximoEventoOptions = {
  /** Only request counters while the panel is visible (calendar view). */
  enabled: boolean;
};

/**
 * Next confirmed published event of the unfiltered list + its check-in counters, for the calendar's
 * "Próximo evento" panel (grit-arena-v3 `ZYxt2`). A failed counter request leaves `resumen` null
 * (the meters show "—") and never blocks the panel.
 */
export function useProximoEvento(eventos: EventoListItem[], { enabled }: UseProximoEventoOptions) {
  const evento = useMemo(() => pickProximoEvento(eventos), [eventos]);
  const eventoId = evento?.id ?? null;
  const [resumen, setResumen] = useState<{ eventoId: string; value: ResumenIngresos | null } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled || !eventoId) return;
    let cancelled = false;
    eventoComprasService
      .resumenIngresos(eventoId)
      .then((value) => {
        if (!cancelled) setResumen({ eventoId, value });
      })
      .catch((error: unknown) => {
        console.error('useProximoEvento: resumen failed', error);
        if (!cancelled) setResumen({ eventoId, value: null });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, eventoId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const current = resumen && resumen.eventoId === eventoId ? resumen : null;

  return {
    evento,
    /** null while loading or after a failure. */
    resumen: current?.value ?? null,
    loadingResumen: Boolean(enabled && eventoId && !current),
    reload,
  };
}
