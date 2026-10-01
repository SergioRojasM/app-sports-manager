'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import { esCompraProxima, puedeCancelarCompra, validarComprobante } from '@/lib/portal/eventos-compra.utils';
import {
  EventoCompraServiceError,
  type EventoCompraEstado,
  type MiCompra,
  type MisEntradasTab,
} from '@/types/portal/eventos-compras.types';

type AccionPendiente = 'cancelar' | 'reenviar';

function mensajeError(error: unknown): string {
  if (error instanceof EventoCompraServiceError) return error.message;
  return 'No se pudo completar la operación. Intenta de nuevo.';
}

/**
 * "Mis Entradas" (US-0121): links the guest purchases made with the account's verified email, then
 * lists the user's purchases with tabs (próximas / pasadas), an estado filter, and the cancel /
 * re-upload actions with per-item pending state and errors.
 */
export function useMisEntradas() {
  const [compras, setCompras] = useState<MiCompra[]>([]);
  // "Now" for the tabs, taken when the list is loaded so the split is stable while the page is open
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `silent` reloads (after an action) keep the list on screen instead of the loading state
  const [reload, setReload] = useState({ key: 0, silent: false });
  const [tab, setTab] = useState<MisEntradasTab>('proximas');
  const [estado, setEstado] = useState<EventoCompraEstado | 'todos'>('todos');
  const [pendiente, setPendiente] = useState<Record<string, AccionPendiente | undefined>>({});
  const [accionError, setAccionError] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      if (!reload.silent) setLoading(true);
      setError(null);
      try {
        // Linking is idempotent; a failure there must not hide the purchases already linked
        await eventoComprasService.vincularComprasInvitado().catch((linkError) => {
          console.error('useMisEntradas: linking failed', linkError);
        });
        const lista = await eventoComprasService.listMisCompras();
        if (!cancelled) {
          setCompras(lista);
          setNow(new Date());
        }
      } catch (loadError) {
        console.error('useMisEntradas: load failed', loadError);
        if (!cancelled) setError('No se pudieron cargar tus entradas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const recargar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: false })), []);
  const refrescar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: true })), []);

  const filtradas = useMemo(
    () =>
      compras.filter(
        (compra) =>
          (tab === 'proximas') === esCompraProxima(compra, now) && (estado === 'todos' || compra.estado === estado),
      ),
    [compras, tab, estado, now],
  );

  const conteo = useMemo(
    () => ({
      proximas: compras.filter((compra) => esCompraProxima(compra, now)).length,
      pasadas: compras.filter((compra) => !esCompraProxima(compra, now)).length,
    }),
    [compras, now],
  );

  const puedeCancelar = useCallback(
    (compra: MiCompra) =>
      puedeCancelarCompra({
        estado: compra.estado,
        cancelacionAntelacionHoras: compra.evento?.cancelacionAntelacionHoras ?? null,
        fechaHora: compra.evento?.fechaHora ?? null,
      }),
    [],
  );

  const ejecutar = useCallback(
    async (compraId: string, accion: AccionPendiente, run: () => Promise<unknown>): Promise<boolean> => {
      setPendiente((prev) => ({ ...prev, [compraId]: accion }));
      setAccionError((prev) => ({ ...prev, [compraId]: undefined }));
      try {
        await run();
        refrescar();
        return true;
      } catch (actionError) {
        if (!(actionError instanceof EventoCompraServiceError) || actionError.code === 'unknown') {
          console.error(`useMisEntradas: ${accion} failed`, actionError);
        }
        setAccionError((prev) => ({ ...prev, [compraId]: mensajeError(actionError) }));
        return false;
      } finally {
        setPendiente((prev) => ({ ...prev, [compraId]: undefined }));
      }
    },
    [refrescar],
  );

  const cancelar = useCallback(
    (compra: MiCompra) => ejecutar(compra.id, 'cancelar', () => eventoComprasService.cancelarCompra(compra.id)),
    [ejecutar],
  );

  const reenviarComprobante = useCallback(
    (compra: MiCompra, file: File) => {
      const invalido = validarComprobante(file);
      if (invalido) {
        setAccionError((prev) => ({ ...prev, [compra.id]: invalido }));
        return Promise.resolve(false);
      }
      return ejecutar(compra.id, 'reenviar', async () => {
        const path = await eventoComprasService.subirArchivoCompra(compra.tenantId, compra.id, 'comprobante', file);
        await eventoComprasService.reenviarComprobante(compra.id, path);
      });
    },
    [ejecutar],
  );

  const limpiarError = useCallback((compraId: string) => {
    setAccionError((prev) => ({ ...prev, [compraId]: undefined }));
  }, []);

  return {
    loading,
    error,
    recargar,
    compras,
    filtradas,
    conteo,
    tab,
    setTab,
    estado,
    setEstado,
    pendiente,
    accionError,
    limpiarError,
    puedeCancelar,
    cancelar,
    reenviarComprobante,
  };
}
