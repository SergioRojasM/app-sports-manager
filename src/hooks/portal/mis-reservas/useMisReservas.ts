'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reservasService } from '@/services/supabase/portal/reservas.service';
import { toCsvString, downloadTextFile } from '@/lib/csv';
import { computePresetRange, computeReservaStats, groupReservasByMonth } from '@/lib/portal/mis-reservas-agrupacion';
import type { ReservaReportRow, ReservasManagementAsistencia } from '@/types/portal/reservas.types';

export type DateRangePreset = 'ultimos_7_dias' | 'ultimo_mes' | 'mes_a_la_fecha' | 'rango_personalizado' | null;

export type TenantOption = { id: string; nombre: string };

export type MisReservasFilterState = {
  datePreset: DateRangePreset;
  fechaDesde: string;
  fechaHasta: string;
  asistencia: ReservasManagementAsistencia | null;
  disciplinaNombre: string;
  tenantId: string;
};

const INITIAL_FILTERS: MisReservasFilterState = {
  datePreset: null,
  fechaDesde: '',
  fechaHasta: '',
  asistencia: null,
  disciplinaNombre: '',
  tenantId: '',
};

type PageSize = 25 | 50 | 100;

/**
 * Options derived from loaded rows — an athlete may not be a member of every tenant their
 * bookings belong to (e.g. public-training bookings), so a tenant-scoped catalog can't be used.
 */
function deriveOptions(rows: ReservaReportRow[]): { disciplines: string[]; tenantOptions: TenantOption[] } {
  const disciplines = new Set<string>();
  const tenants = new Map<string, string>();
  rows.forEach((row) => {
    if (row.disciplina) disciplines.add(row.disciplina);
    if (!tenants.has(row.tenant_id)) tenants.set(row.tenant_id, row.tenant_nombre ?? 'Organización');
  });
  return {
    disciplines: [...disciplines].sort((a, b) => a.localeCompare(b, 'es')),
    tenantOptions: [...tenants.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  };
}

/** Rows loaded without filters are capped at this many by the service. */
export const MIS_RESERVAS_CAP = 100;

function toServiceFilters(atletaId: string, filterState: MisReservasFilterState) {
  let fechaDesde: string | undefined;
  let fechaHasta: string | undefined;

  if (filterState.datePreset === 'rango_personalizado') {
    fechaDesde = filterState.fechaDesde || undefined;
    fechaHasta = filterState.fechaHasta || undefined;
  } else if (filterState.datePreset) {
    const range = computePresetRange(filterState.datePreset);
    fechaDesde = range.desde;
    fechaHasta = range.hasta;
  }

  return {
    atletaId,
    tenantId: filterState.tenantId || undefined,
    fechaDesde,
    fechaHasta,
    asistencia: filterState.asistencia ?? undefined,
    disciplinaNombre: filterState.disciplinaNombre || undefined,
  };
}

function isFiltered(filterState: MisReservasFilterState): boolean {
  return !!(filterState.datePreset || filterState.asistencia || filterState.disciplinaNombre || filterState.tenantId);
}

/**
 * Cross-tenant booking history (grit-arena-v3 `x9xdbA`). Filters apply as soon as they change
 * (server-side query); only the newest response is kept. Discipline / organization options come
 * from the first unfiltered load so they never shrink while filtering.
 */
export function useMisReservas(atletaId: string) {
  const [rows, setRows] = useState<ReservaReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MisReservasFilterState>(INITIAL_FILTERS);
  const [baseOptions, setBaseOptions] = useState<{ disciplines: string[]; tenantOptions: TenantOption[] } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const requestIdRef = useRef(0);

  const hasActiveFilters = isFiltered(filters);

  const fetchReservas = useCallback(
    async (filterState: MisReservasFilterState) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const data = await reservasService.getMisReservas(toServiceFilters(atletaId, filterState));
        if (requestId !== requestIdRef.current) return; // a newer request superseded this one
        setRows(data);
        setCurrentPage(1);
        if (!isFiltered(filterState)) {
          setBaseOptions((current) => current ?? deriveOptions(data));
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Error al cargar las reservas.');
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [atletaId],
  );

  useEffect(() => {
    void fetchReservas(INITIAL_FILTERS);
  }, [fetchReservas]);

  /** Sets one filter and reloads immediately. */
  const updateFilter = useCallback(
    <K extends keyof MisReservasFilterState>(key: K, value: MisReservasFilterState[K]) => {
      const next = { ...filters, [key]: value };
      // Leaving the custom range clears its dates
      if (key === 'datePreset' && value !== 'rango_personalizado') {
        next.fechaDesde = '';
        next.fechaHasta = '';
      }
      setFilters(next);
      void fetchReservas(next);
    },
    [filters, fetchReservas],
  );

  /** Applies a validated custom range ('YYYY-MM-DD' keys) and reloads. */
  const applyCustomRange = useCallback(
    (desde: string, hasta: string) => {
      const next: MisReservasFilterState = { ...filters, datePreset: 'rango_personalizado', fechaDesde: desde, fechaHasta: hasta };
      setFilters(next);
      void fetchReservas(next);
    },
    [filters, fetchReservas],
  );

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    void fetchReservas(INITIAL_FILTERS);
  }, [fetchReservas]);

  const retry = useCallback(() => {
    void fetchReservas(filters);
  }, [fetchReservas, filters]);

  const options = baseOptions ?? deriveOptions(rows);

  const totalFiltered = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const stats = useMemo(() => computeReservaStats(rows), [rows]);
  const pageGroups = useMemo(() => groupReservasByMonth(paginatedRows), [paginatedRows]);
  const isCapped = !hasActiveFilters && rows.length >= MIS_RESERVAS_CAP;

  const handleSetPageSize = useCallback((size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const exportCsv = useCallback(() => {
    if (rows.length === 0) return;

    const exportRows = rows.map((r) => ({
      Organización: r.tenant_nombre ?? '',
      Disciplina: r.disciplina ?? '',
      Entrenamiento: r.entrenamiento_nombre ?? '',
      Plan: r.plan_nombre ?? '',
      'Plan desde': r.plan_fecha_inicio ?? '',
      'Plan hasta': r.plan_fecha_fin ?? '',
      'Fecha entrenamiento': r.entrenamiento_fecha ?? '',
      'Estado reserva': r.reserva_estado,
      Asistencia: r.asistio === true ? 'Asistió' : r.asistio === false ? 'No asistió' : 'Sin registrar',
      'Fecha reserva': r.fecha_reserva ?? '',
      Escenario: r.escenario ?? '',
      Nivel: r.nivel_disciplina ?? '',
    }));

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const csv = toCsvString(exportRows);
    downloadTextFile(csv, `mis-reservas-${dateStr}.csv`);
  }, [rows]);

  return {
    rows,
    loading,
    error,
    disciplines: options.disciplines,
    tenantOptions: options.tenantOptions,

    filters,
    updateFilter,
    applyCustomRange,
    clearFilters,
    retry,
    hasActiveFilters,

    currentPage,
    pageSize,
    totalFiltered,
    totalPages,
    setCurrentPage,
    setPageSize: handleSetPageSize,
    paginatedRows,
    pageGroups,
    stats,
    isCapped,

    exportCsv,
    resultCount: rows.length,
  };
}
