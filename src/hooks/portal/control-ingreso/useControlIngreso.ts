'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { esCodigoTicketValido, normalizarCodigoTicket, resultadoNoEncontrado } from '@/lib/portal/eventos-ingreso.utils';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import type { Evento } from '@/types/portal/eventos.types';
import {
  EventoCompraServiceError,
  type IngresoResultado,
  type ResumenIngresos,
} from '@/types/portal/eventos-compras.types';

/** The same code read again within this window is ignored (the camera keeps decoding it). */
const MISMO_CODIGO_MS = 3000;
/** A green result clears itself so the next attendee can be scanned. */
const OK_AUTO_CIERRE_MS = 4000;

const UNKNOWN_MESSAGE = 'No se pudo completar la operación. Intenta de nuevo.';

function mensajeDe(err: unknown, contexto: string): string {
  if (!(err instanceof EventoCompraServiceError) || err.code === 'unknown') {
    console.error(`useControlIngreso: ${contexto} failed`, err);
  }
  return err instanceof EventoCompraServiceError ? err.message : UNKNOWN_MESSAGE;
}

function vibrar(resultado: IngresoResultado['resultado']) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(resultado === 'ok' ? [80] : [80, 60, 80]);
}

type UseControlIngresoOptions = {
  /** Called after every write (check-in or revert), e.g. to refresh the attendee list. */
  onChange?: () => void;
};

/**
 * Check-in screen state (US-0131): the event, the counters, the last result, and the
 * register / revert actions. While a request is pending or a result is shown, new reads are
 * ignored; the same code is skipped for 3 s.
 */
export function useControlIngreso(tenantId: string, eventoId: string, { onChange }: UseControlIngresoOptions = {}) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [resumen, setResumen] = useState<ResumenIngresos | null>(null);
  const [resultado, setResultado] = useState<IngresoResultado | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ultimoCodigo = useRef<{ codigo: string; at: number } | null>(null);
  const ultimoIntento = useRef<string | null>(null);
  const bloqueado = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const eventoRow = await eventosService.getEventoById(tenantId, eventoId);
        if (cancelled) return;
        setEvento(eventoRow);
        setNotFound(eventoRow === null);
        if (eventoRow) {
          const counters = await eventoComprasService.resumenIngresos(eventoId);
          if (!cancelled) setResumen(counters);
        }
      } catch (err) {
        if (!cancelled) setLoadError(mensajeDe(err, 'load'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [tenantId, eventoId, reloadKey]);

  const recargar = useCallback(() => setReloadKey((key) => key + 1), []);

  const refrescarResumen = useCallback(async () => {
    try {
      setResumen(await eventoComprasService.resumenIngresos(eventoId));
    } catch (err) {
      mensajeDe(err, 'resumen');
    }
  }, [eventoId]);

  const mostrar = useCallback((value: IngresoResultado) => {
    bloqueado.current = true;
    setResultado(value);
    vibrar(value.resultado);
  }, []);

  const siguiente = useCallback(() => {
    bloqueado.current = false;
    setResultado(null);
  }, []);

  // Green results dismiss themselves
  useEffect(() => {
    if (resultado?.resultado !== 'ok') return;
    const timer = window.setTimeout(siguiente, OK_AUTO_CIERRE_MS);
    return () => window.clearTimeout(timer);
  }, [resultado, siguiente]);

  /** `force` skips the lock and the same-code window (manual entry, list actions, "Reintentar"). */
  const registrar = useCallback(
    async (codigoLeido: string, { force = false }: { force?: boolean } = {}) => {
      const codigo = normalizarCodigoTicket(codigoLeido);
      const ahora = Date.now();

      if (!force) {
        if (bloqueado.current) return;
        const ultimo = ultimoCodigo.current;
        if (ultimo && ultimo.codigo === codigo && ahora - ultimo.at < MISMO_CODIGO_MS) return;
      }
      ultimoCodigo.current = { codigo, at: ahora };
      ultimoIntento.current = codigo;
      setError(null);

      if (!esCodigoTicketValido(codigo)) {
        mostrar(resultadoNoEncontrado());
        return;
      }

      bloqueado.current = true;
      setPending(true);
      try {
        const value = await eventoComprasService.registrarIngreso(eventoId, codigo);
        mostrar(value);
        if (value.resultado === 'ok') {
          void refrescarResumen();
          onChange?.();
        }
      } catch (err) {
        bloqueado.current = false;
        setError(mensajeDe(err, 'registrar'));
      } finally {
        setPending(false);
      }
    },
    [eventoId, mostrar, onChange, refrescarResumen],
  );

  const reintentar = useCallback(() => {
    if (ultimoIntento.current) void registrar(ultimoIntento.current, { force: true });
  }, [registrar]);

  /** Returns true on success so callers (modal, card) can close. */
  const revertir = useCallback(
    async (ticketId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      setPending(true);
      setError(null);
      try {
        await eventoComprasService.revertirIngreso(ticketId);
        siguiente();
        void refrescarResumen();
        onChange?.();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: mensajeDe(err, 'revertir') };
      } finally {
        setPending(false);
      }
    },
    [onChange, refrescarResumen, siguiente],
  );

  return {
    evento,
    notFound,
    loading,
    loadError,
    recargar,
    resumen,
    resultado,
    pending,
    error,
    registrar,
    reintentar,
    revertir,
    siguiente,
  };
}
