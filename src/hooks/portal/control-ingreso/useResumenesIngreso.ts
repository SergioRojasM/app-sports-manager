'use client';

import { useEffect, useMemo, useState } from 'react';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import type { ResumenIngresos } from '@/types/portal/eventos-compras.types';

/** `undefined` = not requested yet · `null` = the request failed (the card shows "—"). */
export type ResumenPorEvento = Record<string, ResumenIngresos | null | undefined>;

/**
 * Check-in counters of the events on the selector's current page (grit-arena-v3 `LV7I0`). Calls the
 * existing per-event `resumen_ingresos_evento` RPC in parallel (`allSettled`, so one failure never
 * hides the others) and caches results by id, so going back to a page does not refetch it.
 */
export function useResumenesIngreso(eventoIds: string[]): ResumenPorEvento {
  const [cache, setCache] = useState<ResumenPorEvento>({});
  // Stable dependency for the page's ids
  const key = useMemo(() => eventoIds.join(','), [eventoIds]);

  useEffect(() => {
    const pendientes = key ? key.split(',').filter((id) => !(id in cache)) : [];
    if (pendientes.length === 0) return;
    let cancelled = false;

    void Promise.allSettled(pendientes.map((id) => eventoComprasService.resumenIngresos(id))).then((results) => {
      if (cancelled) return;
      setCache((prev) => {
        const next = { ...prev };
        results.forEach((result, index) => {
          if (result.status === 'rejected') console.error('useResumenesIngreso: resumen failed', result.reason);
          next[pendientes[index]] = result.status === 'fulfilled' ? result.value : null;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // `cache` is read only to skip known ids; refetching when it changes would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return cache;
}
