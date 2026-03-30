'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { gestionSuscripcionesService } from '@/services/supabase/portal/gestion-suscripciones.service';
import {
  GestionSuscripcionesServiceError,
  type PagoEstado,
  type SuscripcionAdminRow,
  type SuscripcionEstado,
  type SuscripcionesAdminStats,
} from '@/types/portal/gestion-suscripciones.types';

type UseGestionSuscripcionesOptions = {
  tenantId: string;
};

type ModalType = 'pago' | 'suscripcion' | 'editar' | 'eliminar' | 'verDetalle' | null;

type UseGestionSuscripcionesResult = {
  /** Full unfiltered list */
  rows: SuscripcionAdminRow[];
  loading: boolean;
  error: string | null;

  /** Search / filter state */
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  suscripcionFilter: SuscripcionEstado | 'all';
  setSuscripcionFilter: (v: SuscripcionEstado | 'all') => void;
  pagoFilter: PagoEstado | 'all';
  setPagoFilter: (v: PagoEstado | 'all') => void;

  /** Pagination state */
  currentPage: number;
  pageSize: 20 | 50 | 100;
  totalFiltered: number;
  totalPages: number;
  setCurrentPage: (n: number) => void;
  setPageSize: (n: 20 | 50 | 100) => void;

  /** Derived data */
  paginatedRows: SuscripcionAdminRow[];
  stats: SuscripcionesAdminStats;

  /** Modal state */
  selectedRow: SuscripcionAdminRow | null;
  modalType: ModalType;
  openPagoModal: (row: SuscripcionAdminRow) => void;
  openSuscripcionModal: (row: SuscripcionAdminRow) => void;
  openEditarModal: (row: SuscripcionAdminRow) => void;
  openEliminarModal: (row: SuscripcionAdminRow) => void;
  openVerDetalleModal: (row: SuscripcionAdminRow) => void;
  closeModal: () => void;

  /** Actions */
  refresh: () => Promise<void>;
};

/* ────────── Helpers ────────── */

function matchesSearch(row: SuscripcionAdminRow, term: string): boolean {
  const lower = term.toLowerCase();
  return (
    row.atleta_nombre.toLowerCase().includes(lower) ||
    row.plan_nombre.toLowerCase().includes(lower) ||
    row.id.toLowerCase().includes(lower)
  );
}

function computeStats(rows: SuscripcionAdminRow[]): SuscripcionesAdminStats {
  let activas = 0;
  let pendientes = 0;
  let pagoPendiente = 0;

  for (const r of rows) {
    if (r.estado === 'activa') activas++;
    if (r.estado === 'pendiente') pendientes++;
    if (r.pago?.estado === 'pendiente') pagoPendiente++;
  }

  return { activas, pendientes, pagoPendiente };
}

/* ────────── Hook ────────── */

export function useGestionSuscripciones({
  tenantId,
}: UseGestionSuscripcionesOptions): UseGestionSuscripcionesResult {
  const [rows, setRows] = useState<SuscripcionAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [suscripcionFilter, setSuscripcionFilter] = useState<SuscripcionEstado | 'all'>('all');
  const [pagoFilter, setPagoFilter] = useState<PagoEstado | 'all'>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeRaw, setPageSizeRaw] = useState<20 | 50 | 100>(20);

  const [selectedRow, setSelectedRow] = useState<SuscripcionAdminRow | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);

  /* ── Fetch ── */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gestionSuscripcionesService.fetchSuscripcionesAdmin(tenantId);
      setRows(data);
    } catch (err) {
      const msg =
        err instanceof GestionSuscripcionesServiceError
          ? err.message
          : 'Error al cargar las suscripciones.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ── Derived: filtered ── */

  const filteredRows = useMemo(() => {
    let result = rows;

    if (suscripcionFilter !== 'all') {
      result = result.filter((r) => r.estado === suscripcionFilter);
    }

    if (pagoFilter !== 'all') {
      result = result.filter((r) => r.pago?.estado === pagoFilter);
    }

    if (searchTerm.trim()) {
      result = result.filter((r) => matchesSearch(r, searchTerm.trim()));
    }

    return result;
  }, [rows, suscripcionFilter, pagoFilter, searchTerm]);

  /* ── Reset page on filter change ── */

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, suscripcionFilter, pagoFilter]);

  /* ── Pagination ── */

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSizeRaw));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSizeRaw;
    return filteredRows.slice(start, start + pageSizeRaw);
  }, [filteredRows, currentPage, pageSizeRaw]);

  const setPageSize = useCallback((n: 20 | 50 | 100) => {
    setPageSizeRaw(n);
    setCurrentPage(1);
  }, []);

  /* ── Stats (from full unfiltered list) ── */

  const stats = useMemo(() => computeStats(rows), [rows]);

  /* ── Modal actions ── */

  const openPagoModal = useCallback((row: SuscripcionAdminRow) => {
    setSelectedRow(row);
    setModalType('pago');
  }, []);

  const openSuscripcionModal = useCallback((row: SuscripcionAdminRow) => {
    setSelectedRow(row);
    setModalType('suscripcion');
  }, []);

  const openEditarModal = useCallback((row: SuscripcionAdminRow) => {
    setSelectedRow(row);
    setModalType('editar');
  }, []);

  const openEliminarModal = useCallback((row: SuscripcionAdminRow) => {
    setSelectedRow(row);
    setModalType('eliminar');
  }, []);

  const openVerDetalleModal = useCallback((row: SuscripcionAdminRow) => {
    setSelectedRow(row);
    setModalType('verDetalle');
  }, []);

  const closeModal = useCallback(() => {
    setSelectedRow(null);
    setModalType(null);
  }, []);

  return {
    rows,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    suscripcionFilter,
    setSuscripcionFilter,
    pagoFilter,
    setPagoFilter,
    currentPage,
    pageSize: pageSizeRaw,
    totalFiltered,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginatedRows,
    stats,
    selectedRow,
    modalType,
    openPagoModal,
    openSuscripcionModal,
    openEditarModal,
    openEliminarModal,
    openVerDetalleModal,
    closeModal,
    refresh: loadData,
  };
}
