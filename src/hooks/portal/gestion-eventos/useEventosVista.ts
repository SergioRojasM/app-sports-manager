'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EVENTOS_VISTAS, type EventosVista } from '@/types/portal/eventos.types';

const DEFAULT_VISTA: EventosVista = 'tarjetas';

function parseVista(value: string | null): EventosVista {
  return EVENTOS_VISTAS.includes(value as EventosVista) ? (value as EventosVista) : DEFAULT_VISTA;
}

/** Keeps the selected events view in `?vista=` so it survives reloads and can be shared. */
export function useEventosVista(): { vista: EventosVista; setVista: (vista: EventosVista) => void } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const vista = parseVista(searchParams.get('vista'));

  const setVista = useCallback(
    (next: EventosVista) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('vista', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { vista, setVista };
}
