'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';

/**
 * Whether the signed-in user already holds a live ticket for the event (US-0121), so the portal
 * event page can point to "Mis Entradas" instead of opening the checkout.
 * `checked` stays false until the answer is known.
 */
export function useMiTicketEnEvento(eventoId: string) {
  const { user, initializing } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<{ key: string | null; tieneEntrada: boolean }>({ key: null, tieneEntrada: false });
  const key = initializing ? null : `${eventoId}:${userId ?? ''}`;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;

    const check = userId ? eventoComprasService.getMiTicketEnEvento(eventoId) : Promise.resolve(null);
    check
      .then((ticket) => {
        if (!cancelled) setState({ key, tieneEntrada: ticket !== null });
      })
      .catch((error) => {
        // Not knowing only means the checkout opens; step 1 checks again
        console.error('useMiTicketEnEvento: check failed', error);
        if (!cancelled) setState({ key, tieneEntrada: false });
      });

    return () => {
      cancelled = true;
    };
  }, [key, eventoId, userId]);

  return { checked: key !== null && state.key === key, tieneEntrada: state.key === key && state.tieneEntrada };
}
