'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const MESSAGES: Record<string, string> = {
  creado: 'Evento creado correctamente.',
  editado: 'Evento actualizado correctamente.',
};

/**
 * Reads the one-shot `?guardado=creado|editado` flag the wizard redirects with (US-0119),
 * keeps its message in state, and strips the param so a reload does not show it again.
 */
export function useEventoGuardadoBanner(): { message: string | null; dismiss: () => void } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guardado = searchParams.get('guardado');
  const [message, setMessage] = useState<string | null>(() => (guardado ? MESSAGES[guardado] ?? null : null));

  useEffect(() => {
    if (!guardado) return;
    // The message was captured by the initial state; only the URL needs cleaning

    const params = new URLSearchParams(searchParams.toString());
    params.delete('guardado');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [guardado, pathname, router, searchParams]);

  const dismiss = useCallback(() => setMessage(null), []);

  return { message, dismiss };
}
