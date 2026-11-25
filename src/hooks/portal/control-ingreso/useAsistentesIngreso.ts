'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useVisibleInterval } from '@/hooks/portal/useVisibleInterval';
import { contarAsistentes, ordenarAsistentes, ultimosIngresos } from '@/lib/portal/eventos-ingreso.utils';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import type {
  AsistenteIngreso,
  AsistentesIngresoFiltro,
  AsistentesIngresoOrden,
} from '@/types/portal/eventos-compras.types';

export const ASISTENTES_INGRESO_PAGE_SIZE = 50;

/** Silent refresh while the tab is visible, so other doors' check-ins show up ("En vivo"). */
export const CHECKIN_POLL_MS = 20_000;

type UseAsistentesIngresoOptions = {
  /** Skip the poll while a register / revert is running, so a stale response cannot win. */
  pausado?: boolean;
};

function normalizar(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Attendee list of the check-in screen (US-0131, grit-arena-v3 `xjlmU`): the event's `activa`
 * tickets, searched by name / email / code, filtered by entry status, sorted, paged on the client
 * (50), with segment counts, the latest check-ins and a 20 s silent refresh.
 */
export function useAsistentesIngreso(eventoId: string, { pausado = false }: UseAsistentesIngresoOptions = {}) {
  const [asistentes, setAsistentes] = useState<AsistenteIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState({ key: 0, silent: false });

  const [filtro, setFiltroState] = useState<AsistentesIngresoFiltro>('todos');
  const [orden, setOrdenState] = useState<AsistentesIngresoOrden>('pendientes');
  const [search, setSearchState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      if (!reload.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const lista = await eventoComprasService.listAsistentesEvento(eventoId);
        if (!cancelled) {
          setAsistentes(lista);
          setError(null);
        }
      } catch (loadError) {
        console.error('useAsistentesIngreso: load failed', loadError);
        // A failed background refresh keeps the list on screen
        if (!cancelled && !reload.silent) setError('No se pudo cargar la lista de asistentes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [eventoId, reload]);

  const recargar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: false })), []);
  /** Reload after a check-in or revert, keeping the list on screen. */
  const refrescar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: true })), []);

  useVisibleInterval(refrescar, CHECKIN_POLL_MS, !pausado);

  const conteos = useMemo(() => contarAsistentes(asistentes), [asistentes]);
  const recientes = useMemo(() => ultimosIngresos(asistentes, 5), [asistentes]);

  const filtrados = useMemo(() => {
    const needle = normalizar(search.trim());
    const visibles = asistentes.filter(
      (asistente) =>
        (filtro === 'todos' ||
          (filtro === 'ingresaron' ? asistente.ingresoAt !== null : asistente.ingresoAt === null)) &&
        (!needle ||
          normalizar(`${asistente.asistenteNombre} ${asistente.asistenteEmail} ${asistente.codigo}`).includes(needle)),
    );
    return ordenarAsistentes(visibles, orden);
  }, [asistentes, filtro, search, orden]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / ASISTENTES_INGRESO_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginados = filtrados.slice((page - 1) * ASISTENTES_INGRESO_PAGE_SIZE, page * ASISTENTES_INGRESO_PAGE_SIZE);

  const setFiltro = useCallback((value: AsistentesIngresoFiltro) => {
    setFiltroState(value);
    setCurrentPage(1);
  }, []);

  const setOrden = useCallback((value: AsistentesIngresoOrden) => {
    setOrdenState(value);
    setCurrentPage(1);
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setCurrentPage(1);
  }, []);

  const hayFiltros = filtro !== 'todos' || search.trim() !== '';
  const limpiarFiltros = useCallback(() => {
    setFiltroState('todos');
    setSearchState('');
    setCurrentPage(1);
  }, []);

  return {
    asistentes,
    loading,
    error,
    recargar,
    refrescar,
    filtrados,
    paginados,
    filtro,
    setFiltro,
    orden,
    setOrden,
    conteos,
    recientes,
    search,
    setSearch,
    hayFiltros,
    limpiarFiltros,
    currentPage: page,
    totalPages,
    setCurrentPage,
  };
}
