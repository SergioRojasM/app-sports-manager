'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import type { Evento } from '@/types/portal/eventos.types';
import type {
  CompraAdminItem,
  EventoComprasEstadoFiltro,
  EventoComprasStats,
} from '@/types/portal/eventos-compras.types';

export const EVENTO_COMPRAS_PAGE_SIZE = 20;

function normalizar(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Admin "Compras" page of one event (US-0121): the event, its purchases (RLS: staff), the sold
 * count against capacity, stats, estado + name/email filters and client-side pagination.
 */
export function useEventoCompras(tenantId: string, eventoId: string) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [compras, setCompras] = useState<CompraAdminItem[]>([]);
  const [vendidas, setVendidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reload, setReload] = useState({ key: 0, silent: false });

  const [estado, setEstadoState] = useState<EventoComprasEstadoFiltro>('todos');
  const [search, setSearchState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      if (!reload.silent) setLoading(true);
      setError(null);
      try {
        const [eventoRow, lista, count] = await Promise.all([
          eventosService.getEventoById(tenantId, eventoId),
          eventoComprasService.listComprasEvento(tenantId, eventoId),
          eventoComprasService.contarVendidas(eventoId),
        ]);
        if (cancelled) return;
        setEvento(eventoRow);
        setNotFound(eventoRow === null);
        setCompras(lista);
        setVendidas(count);
      } catch (loadError) {
        console.error('useEventoCompras: load failed', loadError);
        if (!cancelled) setError('No se pudieron cargar las compras del evento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [tenantId, eventoId, reload]);

  const recargar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: false })), []);
  /** Reload after an action, keeping the table on screen. */
  const refrescar = useCallback(() => setReload((prev) => ({ key: prev.key + 1, silent: true })), []);

  const stats: EventoComprasStats = useMemo(
    () => ({
      enValidacion: compras.filter((compra) => compra.estado === 'en_validacion').length,
      confirmadas: compras.filter((compra) => compra.estado === 'confirmada').length,
      ingresosConfirmados: compras
        .filter((compra) => compra.estado === 'confirmada')
        .reduce((sum, compra) => sum + compra.total, 0),
    }),
    [compras],
  );

  const filtradas = useMemo(() => {
    const needle = normalizar(search.trim());
    return compras.filter(
      (compra) =>
        (estado === 'todos' || compra.estado === estado) &&
        (!needle || normalizar(`${compra.compradorNombre} ${compra.compradorEmail}`).includes(needle)),
    );
  }, [compras, estado, search]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / EVENTO_COMPRAS_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginadas = filtradas.slice((page - 1) * EVENTO_COMPRAS_PAGE_SIZE, page * EVENTO_COMPRAS_PAGE_SIZE);

  const setEstado = useCallback((value: EventoComprasEstadoFiltro) => {
    setEstadoState(value);
    setCurrentPage(1);
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setCurrentPage(1);
  }, []);

  const hayFiltros = estado !== 'todos' || search.trim() !== '';
  const limpiarFiltros = useCallback(() => {
    setEstadoState('todos');
    setSearchState('');
    setCurrentPage(1);
  }, []);

  return {
    evento,
    notFound,
    loading,
    error,
    recargar,
    refrescar,
    compras,
    vendidas,
    stats,
    filtradas,
    paginadas,
    estado,
    setEstado,
    search,
    setSearch,
    hayFiltros,
    limpiarFiltros,
    currentPage: page,
    totalPages,
    setCurrentPage,
    pageSize: EVENTO_COMPRAS_PAGE_SIZE,
  };
}
