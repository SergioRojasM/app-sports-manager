'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { reservasService } from '@/services/supabase/portal/reservas.service';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import { toCsvString, downloadTextFile } from '@/lib/csv';
import type { ReservaReportRow, ReservasManagementAsistencia } from '@/types/portal/reservas.types';
import type { Discipline } from '@/types/portal/disciplines.types';

export type DateRangePreset = 'ultimos_7_dias' | 'ultimo_mes' | 'mes_a_la_fecha' | 'rango_personalizado' | null;

export type GestionReservasFilterState = {
  datePreset: DateRangePreset;
  fechaDesde: string;
  fechaHasta: string;
  atletaSearch: string;
  asistencia: ReservasManagementAsistencia | null;
  disciplinaNombre: string;
};

const INITIAL_FILTERS: GestionReservasFilterState = {
  datePreset: null,
  fechaDesde: '',
  fechaHasta: '',
  atletaSearch: '',
  asistencia: null,
  disciplinaNombre: '',
};

function computeDateRange(preset: DateRangePreset): { desde: string; hasta: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hasta = fmt(today);

  switch (preset) {
    case 'ultimos_7_dias': {
      const desde = new Date(today);
      desde.setDate(desde.getDate() - 7);
      return { desde: fmt(desde), hasta };
    }
    case 'ultimo_mes': {
      const desde = new Date(today);
      desde.setDate(desde.getDate() - 30);
      return { desde: fmt(desde), hasta };
    }
    case 'mes_a_la_fecha': {
      const desde = new Date(today.getFullYear(), today.getMonth(), 1);
      return { desde: fmt(desde), hasta };
    }
    default:
      return { desde: '', hasta: '' };
  }
}

type PageSize = 25 | 50 | 100;

export function useGestionReservas(tenantId: string) {
  const [rows, setRows] = useState<ReservaReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  const [filters, setFilters] = useState<GestionReservasFilterState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<GestionReservasFilterState>(INITIAL_FILTERS);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  const hasActiveFilters = useMemo(() => {
    return !!(
      appliedFilters.datePreset ||
      appliedFilters.atletaSearch ||
      appliedFilters.asistencia ||
      appliedFilters.disciplinaNombre
    );
  }, [appliedFilters]);

  const fetchReservas = useCallback(
    async (filterState: GestionReservasFilterState) => {
      setLoading(true);
      setError(null);
      try {
        let fechaDesde: string | undefined;
        let fechaHasta: string | undefined;

        if (filterState.datePreset && filterState.datePreset !== 'rango_personalizado') {
          const range = computeDateRange(filterState.datePreset);
          fechaDesde = range.desde;
          fechaHasta = range.hasta;
        } else if (filterState.datePreset === 'rango_personalizado') {
          fechaDesde = filterState.fechaDesde || undefined;
          fechaHasta = filterState.fechaHasta || undefined;
        }

        const data = await reservasService.getReservasManagement({
          tenantId,
          fechaDesde,
          fechaHasta,
          atletaSearch: filterState.atletaSearch || undefined,
          asistencia: filterState.asistencia ?? undefined,
          disciplinaNombre: filterState.disciplinaNombre || undefined,
        });

        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar las reservas.');
      } finally {
        setLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    fetchReservas(INITIAL_FILTERS);
  }, [fetchReservas]);

  useEffect(() => {
    disciplinesService.listDisciplinesByTenant(tenantId).then(setDisciplines).catch(() => {});
  }, [tenantId]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
    fetchReservas(filters);
  }, [filters, fetchReservas]);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setCurrentPage(1);
    fetchReservas(INITIAL_FILTERS);
  }, [fetchReservas]);

  const updateFilter = useCallback(<K extends keyof GestionReservasFilterState>(
    key: K,
    value: GestionReservasFilterState[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const totalFiltered = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const handleSetPageSize = useCallback((size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const exportCsv = useCallback(() => {
    if (rows.length === 0) return;

    const exportRows = rows.map((r) => ({
      Atleta: [r.atleta_nombre, r.atleta_apellido].filter(Boolean).join(' '),
      Email: r.atleta_email,
      Identificacion: r.numero_identificacion ?? '',
      Disciplina: r.disciplina ?? '',
      Entrenamiento: r.entrenamiento_nombre ?? '',
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
    downloadTextFile(csv, `reservas-${dateStr}.csv`);
  }, [rows]);

  const resultCount = rows.length;

  return {
    rows,
    loading,
    error,
    disciplines,

    filters,
    updateFilter,
    applyFilters,
    clearFilters,
    hasActiveFilters,

    currentPage,
    pageSize,
    totalFiltered,
    totalPages,
    setCurrentPage,
    setPageSize: handleSetPageSize,
    paginatedRows,

    exportCsv,
    resultCount,
  };
}
