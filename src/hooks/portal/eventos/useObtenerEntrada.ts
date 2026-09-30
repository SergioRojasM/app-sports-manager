'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/auth/useAuth';
import { buildEventoLandingDetalleHref, buildEventoPortalDetalleHref } from '@/lib/portal/eventos-publicos.utils';
import type { EventoEntradasModo, EventoPublicoListItem } from '@/types/portal/eventos.types';

/** Where the "Obtener entrada" button lives; decides what each branch of the flow does. */
export type ObtenerEntradaSurface = 'portal' | 'landing-listado' | 'landing-detalle';

type UseObtenerEntradaOptions = {
  surface: ObtenerEntradaSurface;
  /**
   * Detail pages only: the loaded event and whether loading finished, so `?entradas=1`
   * can open the tickets modal once the event is known.
   */
  autoOpen?: { evento: EventoPublicoListItem | null; ready: boolean };
};

/**
 * Get-ticket entry flow (US-0120). With a session: the tickets modal on portal pages, or a jump to
 * the portal detail from the landing. Without one: the signup / login / continue-without-signup modal.
 * Performs no I/O of its own.
 */
export function useObtenerEntrada({ surface, autoOpen }: UseObtenerEntradaOptions) {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [target, setTarget] = useState<EventoPublicoListItem | null>(null);
  const [registroModalOpen, setRegistroModalOpen] = useState(false);
  const [entradasModo, setEntradasModo] = useState<EventoEntradasModo | null>(null);

  // `?entradas=1` is read once when the page mounts; the auto-open is then derived, not set in an effect
  const [autoOpenRequested] = useState(() => autoOpen !== undefined && searchParams.get('entradas') === '1');
  const [autoOpenDismissed, setAutoOpenDismissed] = useState(false);
  const paramCleanupDone = useRef(false);

  const autoOpenEvento = autoOpen?.evento ?? null;
  const autoOpenReady = autoOpen?.ready ?? false;
  const autoOpenPending = autoOpenRequested && !autoOpenDismissed && autoOpenReady && !initializing;
  // A logged-in visitor on the public page belongs in the portal flow instead
  const autoOpenRedirect = autoOpenPending && autoOpenEvento !== null && surface !== 'portal' && user !== null;
  const autoOpenActive = autoOpenPending && autoOpenEvento !== null && !autoOpenRedirect;

  const openEntradas = useCallback((evento: EventoPublicoListItem, modo: EventoEntradasModo) => {
    setAutoOpenDismissed(true);
    setTarget(evento);
    setRegistroModalOpen(false);
    setEntradasModo(modo);
  }, []);

  const obtenerEntrada = useCallback(
    (evento: EventoPublicoListItem) => {
      // Never pick a branch while the session is still resolving
      if (initializing) return;

      if (user) {
        if (surface === 'portal') {
          openEntradas(evento, 'usuario');
        } else {
          router.push(buildEventoPortalDetalleHref(evento.id, { entradas: true }));
        }
        return;
      }

      setAutoOpenDismissed(true);
      setTarget(evento);
      setRegistroModalOpen(true);
    },
    [initializing, user, surface, openEntradas, router],
  );

  const continuarSinRegistro = useCallback(() => {
    if (!target) return;
    if (surface === 'landing-detalle') {
      openEntradas(target, 'invitado');
      return;
    }
    setRegistroModalOpen(false);
    router.push(buildEventoLandingDetalleHref(target.id, { entradas: true }));
  }, [target, surface, openEntradas, router]);

  // Once the auto-open was resolved, drop `?entradas=1` from the URL (or jump to the portal page)
  useEffect(() => {
    if (!autoOpenPending || paramCleanupDone.current) return;
    paramCleanupDone.current = true;

    if (autoOpenRedirect && autoOpenEvento) {
      router.replace(buildEventoPortalDetalleHref(autoOpenEvento.id, { entradas: true }));
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('entradas');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [autoOpenPending, autoOpenRedirect, autoOpenEvento, searchParams, router, pathname]);

  const modalTarget = autoOpenActive ? autoOpenEvento : target;
  const next = modalTarget ? buildEventoPortalDetalleHref(modalTarget.id, { entradas: true }) : '/portal/eventos';

  return {
    obtenerEntrada,
    disabled: initializing,
    target: modalTarget,
    registroModalOpen,
    closeRegistroModal: () => setRegistroModalOpen(false),
    continuarSinRegistro,
    signupHref: `/auth/signup?next=${encodeURIComponent(next)}`,
    loginHref: `/auth/login?next=${encodeURIComponent(next)}`,
    entradasModal: {
      open: autoOpenActive || (entradasModo !== null && target !== null),
      modo: autoOpenActive ? (surface === 'portal' ? 'usuario' : 'invitado') : (entradasModo ?? 'usuario'),
      close: () => {
        setAutoOpenDismissed(true);
        setEntradasModo(null);
      },
    },
  };
}
