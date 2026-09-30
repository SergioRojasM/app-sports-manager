'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EVENTOS_PUBLICOS_LIMIT, eventosService } from '@/services/supabase/portal/eventos.service';
import { toDateKeyInBogota } from '@/lib/portal/eventos.utils';
import {
  EVENTOS_DEFAULT_WINDOW_DAYS,
  addDaysKeyInBogota,
  computeEventosChipRange,
  matchesEventoSearch,
  todayKeyInBogota,
} from '@/lib/portal/eventos-publicos.utils';
import type { EventoPublicoListItem, EventosPublicosDateChip } from '@/types/portal/eventos.types';

export type EventosCalendarMonth = { year: number; month: number };

export type EventosTenantOption = { id: string; label: string };

function currentBogotaMonth(): EventosCalendarMonth {
  const [year, month] = todayKeyInBogota().split('-').map(Number);
  return { year, month: month - 1 };
}

function defaultRange(): { dateFrom: string; dateTo: string } {
  const today = todayKeyInBogota();
  return { dateFrom: today, dateTo: addDaysKeyInBogota(today, EVENTOS_DEFAULT_WINDOW_DAYS) };
}

/**
 * Portal event discovery (US-0120): public events of every tenant plus the private events of the
 * user's own tenants, filtered client-side by Bogotá date range, search, organization and discipline.
 */
export function useEventosPublicos() {
  const [rawItems, setRawItems] = useState<EventoPublicoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState<string | null>(() => defaultRange().dateFrom);
  const [dateTo, setDateTo] = useState<string | null>(() => defaultRange().dateTo);
  const [calendarMonth, setCalendarMonth] = useState<EventosCalendarMonth>(currentBogotaMonth);
  const [search, setSearch] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [disciplina, setDisciplina] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const eventos = await eventosService.listEventosPublicados({ soloPublicos: false });
      if (eventos.length >= EVENTOS_PUBLICOS_LIMIT) {
        console.warn(`useEventosPublicos: the listing reached the ${EVENTOS_PUBLICOS_LIMIT}-event cap`);
      }
      setRawItems(eventos);
    } catch (loadError) {
      console.error('useEventosPublicos: failed to load events', loadError);
      setRawItems([]);
      setError('No fue posible cargar los eventos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDateRange = useCallback((from: string | null, to: string | null) => {
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const clearDateRange = useCallback(() => {
    setDateFrom(null);
    setDateTo(null);
  }, []);

  const applyDateChip = useCallback(
    (chip: EventosPublicosDateChip) => {
      const range = computeEventosChipRange(chip);
      if (dateFrom === range.dateFrom && dateTo === range.dateTo) {
        clearDateRange();
        return;
      }
      setDateRange(range.dateFrom, range.dateTo);
    },
    [dateFrom, dateTo, clearDateRange, setDateRange],
  );

  const goToPrevMonth = useCallback(() => {
    setCalendarMonth((current) => {
      const now = currentBogotaMonth();
      if (current.year === now.year && current.month === now.month) return current;
      const prev = new Date(Date.UTC(current.year, current.month - 1, 1));
      return { year: prev.getUTCFullYear(), month: prev.getUTCMonth() };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalendarMonth((current) => {
      const next = new Date(Date.UTC(current.year, current.month + 1, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }, []);

  const clearFilters = useCallback(() => {
    const range = defaultRange();
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setSearch('');
    setTenantId(null);
    setDisciplina(null);
    setCalendarMonth(currentBogotaMonth());
  }, []);

  const tenantOptions = useMemo<EventosTenantOption[]>(() => {
    const seen = new Map<string, string>();
    for (const item of rawItems) {
      if (!seen.has(item.tenantId)) seen.set(item.tenantId, item.nombreTenant || 'Organización');
    }
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label, 'es'));
  }, [rawItems]);

  const disciplinaOptions = useMemo(
    () =>
      Array.from(new Set(rawItems.map((item) => item.disciplinaNombre))).sort((left, right) =>
        left.localeCompare(right, 'es'),
      ),
    [rawItems],
  );

  const filteredItems = useMemo(() => {
    const filtered = rawItems.filter((item) => {
      // Undated published events are never hidden by the date filter
      if (item.fechaHora && (dateFrom || dateTo)) {
        const key = toDateKeyInBogota(item.fechaHora);
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }
      if (tenantId && item.tenantId !== tenantId) return false;
      if (disciplina && item.disciplinaNombre !== disciplina) return false;
      return matchesEventoSearch(item, search);
    });

    // Server order is fecha_hora asc, nulls last; add the name tiebreak here
    return filtered.sort((left, right) => {
      if (left.fechaHora && right.fechaHora) {
        const byDate = left.fechaHora.localeCompare(right.fechaHora);
        if (byDate !== 0) return byDate;
      } else if (left.fechaHora || right.fechaHora) {
        return left.fechaHora ? -1 : 1;
      }
      return left.nombre.localeCompare(right.nombre, 'es');
    });
  }, [rawItems, dateFrom, dateTo, tenantId, disciplina, search]);

  const isDefaultDateRange = useMemo(() => {
    const range = defaultRange();
    return dateFrom === range.dateFrom && dateTo === range.dateTo;
  }, [dateFrom, dateTo]);

  const hasActiveFilters = !isDefaultDateRange || search.trim() !== '' || tenantId !== null || disciplina !== null;

  return {
    loading,
    error,
    items: filteredItems,
    allItems: rawItems,
    featuredItem: filteredItems[0] ?? null,
    standardItems: filteredItems.slice(1),
    tenantOptions,
    disciplinaOptions,
    dateFrom,
    dateTo,
    isDefaultDateRange,
    calendarMonth,
    goToPrevMonth,
    goToNextMonth,
    setDateRange,
    clearDateRange,
    applyDateChip,
    search,
    setSearch,
    tenantId,
    setTenantId,
    disciplina,
    setDisciplina,
    hasActiveFilters,
    clearFilters,
    refetch: load,
  };
}
