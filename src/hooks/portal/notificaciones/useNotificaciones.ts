'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { notificacionesService } from '@/services/supabase/portal/notificaciones.service';
import type { Notificacion } from '@/types/portal/notificaciones.types';

// The header bell and the history page are separate instances: whoever changes something tells the other
const SYNC_EVENT = 'notificaciones:sync';

type UseNotificacionesOptions = {
  /** Page size (the panel shows the latest 10, the history page 20). */
  limit: number;
  /** Subscribes to Realtime inserts. Only the header bell does: one channel per tab. */
  realtime?: boolean;
};

/**
 * In-app notifications of the signed-in user (US-0125): one page of the inbox, the unread count,
 * mark-as-read actions and — for the bell — real-time arrival. It never throws: a failed load
 * leaves `error` set and the count at 0, so the portal header keeps rendering.
 */
export function useNotificaciones({ limit, realtime = false }: UseNotificacionesOptions) {
  const instanceId = useId();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [total, setTotal] = useState(0);
  const [noLeidas, setNoLeidas] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `silent` reloads (realtime, focus, sync) keep the list on screen instead of the loading state
  const [reload, setReload] = useState({ key: 0, silent: false });
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  // Text for the aria-live region of the bell
  const [anuncio, setAnuncio] = useState('');

  const recargar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: false })), []);
  const refrescar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: true })), []);

  const avisar = useCallback(() => {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: instanceId }));
  }, [instanceId]);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      if (!reload.silent) setLoading(true);
      try {
        const [listado, sinLeer] = await Promise.all([
          notificacionesService.listar({ limit, offset: (page - 1) * limit }),
          notificacionesService.contarNoLeidas(),
        ]);
        if (cancelled) return;
        setItems(listado.items);
        setTotal(listado.total);
        setNoLeidas(sinLeer);
        setError(null);
      } catch (loadError) {
        console.error('useNotificaciones: load failed', loadError);
        if (cancelled) return;
        setNoLeidas(0);
        setError('No se pudieron cargar tus notificaciones.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [reload, page, limit]);

  // Realtime (bell only)
  useEffect(() => {
    if (!realtime) return;
    let cancelled = false;

    notificacionesService
      .getUsuarioId()
      .then((id) => {
        if (!cancelled) setUsuarioId(id);
      })
      .catch((authError) => console.error('useNotificaciones: user lookup failed', authError));

    return () => {
      cancelled = true;
    };
  }, [realtime]);

  useEffect(() => {
    if (!realtime || !usuarioId) return;

    return notificacionesService.suscribir(
      usuarioId,
      (nueva) => {
        setItems((prev) => (prev.some((item) => item.id === nueva.id) ? prev : [nueva, ...prev].slice(0, limit)));
        setTotal((prev) => prev + 1);
        setNoLeidas((prev) => prev + 1);
        setAnuncio(`Nueva notificación: ${nueva.titulo}`);
        avisar();
      },
      refrescar,
    );
  }, [realtime, usuarioId, limit, avisar, refrescar]);

  // Other instance changed something, or the tab is visible again (events missed in background)
  useEffect(() => {
    const onSync = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) refrescar();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refrescar();
    };

    window.addEventListener(SYNC_EVENT, onSync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [instanceId, refrescar]);

  const marcarLeida = useCallback(
    async (id: string) => {
      const objetivo = items.find((item) => item.id === id);
      if (!objetivo || objetivo.leida) return;

      // Optimistic; a failure reloads the real state
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, leida: true } : item)));
      setNoLeidas((prev) => Math.max(0, prev - 1));
      try {
        await notificacionesService.marcarLeida(id);
        avisar();
      } catch (markError) {
        console.error('useNotificaciones: mark read failed', markError);
        refrescar();
      }
    },
    [items, avisar, refrescar],
  );

  const marcarTodasLeidas = useCallback(async () => {
    setItems((prev) => prev.map((item) => (item.leida ? item : { ...item, leida: true })));
    setNoLeidas(0);
    try {
      await notificacionesService.marcarTodasLeidas();
      avisar();
    } catch (markError) {
      console.error('useNotificaciones: mark all read failed', markError);
      refrescar();
    }
  }, [avisar, refrescar]);

  return {
    items,
    total,
    noLeidas,
    loading,
    error,
    anuncio,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    setPage,
    recargar,
    marcarLeida,
    marcarTodasLeidas,
  };
}
