'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import type { AsistenteIngreso, AsistentesIngresoFiltro } from '@/types/portal/eventos-compras.types';

export const ASISTENTES_INGRESO_PAGE_SIZE = 20;

function normalizar(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Attendee list of the check-in screen (US-0131): the event's `activa` tickets, searched by
 * name / email / code, filtered by entry status and paged on the client.
 */
export function useAsistentesIngreso(eventoId: string) {
  const [asistentes, setAsistentes] = useState<AsistenteIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState({ key: 0, silent: false });

  const [filtro, setFiltroState] = useState<AsistentesIngresoFiltro>('todos');
  const [search, setSearchState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      if (!reload.silent) setLoading(true);
      setError(null);
      try {
        const lista = await eventoComprasService.listAsistentesEvento(eventoId);
        if (!cancelled) setAsistentes(lista);
      } catch (loadError) {
        console.error('useAsistentesIngreso: load failed', loadError);
        if (!cancelled) setError('No se pudo cargar la lista de asistentes.');
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

  const filtrados = useMemo(() => {
    const needle = normalizar(search.trim());
    return asistentes.filter(
      (asistente) =>
        (filtro === 'todos' ||
          (filtro === 'ingresaron' ? asistente.ingresoAt !== null : asistente.ingresoAt === null)) &&
        (!needle ||
          normalizar(`${asistente.asistenteNombre} ${asistente.asistenteEmail} ${asistente.codigo}`).includes(needle)),
    );
  }, [asistentes, filtro, search]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / ASISTENTES_INGRESO_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginados = filtrados.slice((page - 1) * ASISTENTES_INGRESO_PAGE_SIZE, page * ASISTENTES_INGRESO_PAGE_SIZE);

  const setFiltro = useCallback((value: AsistentesIngresoFiltro) => {
    setFiltroState(value);
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
    search,
    setSearch,
    hayFiltros,
    limpiarFiltros,
    currentPage: page,
    totalPages,
    setCurrentPage,
  };
}
