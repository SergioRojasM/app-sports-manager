'use client';

import { useEffect, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';

export type EventoConFormulario = { id: string; nombre: string; borrador: boolean };

/**
 * Events that use a form template, for the editor's "update your events" notice (US-0121).
 * A failed lookup only hides the notice; it never blocks editing the template.
 */
export function useEventosConFormulario(tenantId: string, plantillaId: string): EventoConFormulario[] {
  const [eventos, setEventos] = useState<EventoConFormulario[]>([]);

  useEffect(() => {
    let cancelled = false;

    eventosService
      .listEventosPorFormulario(tenantId, plantillaId)
      .then((lista) => {
        if (!cancelled) setEventos(lista);
      })
      .catch((error) => {
        console.error('useEventosConFormulario: load failed', error);
        if (!cancelled) setEventos([]);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, plantillaId]);

  return eventos;
}
