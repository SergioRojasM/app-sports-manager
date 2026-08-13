'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { entrenamientosPublicosService } from '@/services/supabase/portal/entrenamientos-publicos.service';
import type { PublicTrainingDateChip, PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';

type CalendarMonth = { year: number; month: number };

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(reference: Date): Date {
  const day = reference.getDay();
  const diff = (day + 6) % 7; // Monday-based week
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

function endOfCurrentMonthKey(reference: Date): string {
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return toDateKey(end);
}

export function computeChipRange(chip: PublicTrainingDateChip): { dateFrom: string; dateTo: string } {
  const now = new Date();

  if (chip === 'today') {
    const key = toDateKey(now);
    return { dateFrom: key, dateTo: key };
  }

  if (chip === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const key = toDateKey(tomorrow);
    return { dateFrom: key, dateTo: key };
  }

  if (chip === 'this_week') {
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { dateFrom: toDateKey(weekStart), dateTo: toDateKey(weekEnd) };
  }

  // weekend: the Saturday/Sunday of the current week
  const weekStart = startOfWeek(now);
  const saturday = new Date(weekStart);
  saturday.setDate(saturday.getDate() + 5);
  const sunday = new Date(weekStart);
  sunday.setDate(sunday.getDate() + 6);
  return { dateFrom: toDateKey(saturday), dateTo: toDateKey(sunday) };
}

export function useEntrenamientosPublicosMarketplace() {
  const [rawItems, setRawItems] = useState<PublicTrainingListItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState<string | null>(() => toDateKey(new Date()));
  const [dateTo, setDateTo] = useState<string | null>(() => endOfCurrentMonthKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [search, setSearch] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [trainings, tenants] = await Promise.all([
        entrenamientosPublicosService.listPublicTrainings(),
        entrenamientosPublicosService.listPublicTenantOptions(),
      ]);
      setRawItems(trainings);
      setTenantOptions(tenants);
    } catch {
      setRawItems([]);
      setError('No fue posible cargar los entrenamientos públicos.');
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
    (chip: PublicTrainingDateChip) => {
      const range = computeChipRange(chip);
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
      const now = new Date();
      const isCurrentRealMonth = current.year === now.getFullYear() && current.month === now.getMonth();
      if (isCurrentRealMonth) return current;

      const prev = new Date(current.year, current.month - 1, 1);
      return { year: prev.getFullYear(), month: prev.getMonth() };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalendarMonth((current) => {
      const next = new Date(current.year, current.month + 1, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }, []);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rawItems
      .filter((item) => {
        if (!dateFrom && !dateTo) return true;
        if (!item.fechaHora) return false;
        const key = toDateKey(new Date(item.fechaHora));
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
        return true;
      })
      .filter((item) => !tenantId || item.tenantId === tenantId)
      .filter((item) => {
        if (!needle) return true;
        return (
          item.nombre.toLowerCase().includes(needle) ||
          (item.descripcion ?? '').toLowerCase().includes(needle) ||
          // A session is also findable by a service it requires (US-0094)
          item.serviciosRequeridos.some((servicio) => servicio.toLowerCase().includes(needle))
        );
      });
  }, [rawItems, dateFrom, dateTo, tenantId, search]);

  const featuredItem = filteredItems[0] ?? null;
  const standardItems = filteredItems.slice(1);

  return {
    loading,
    error,
    items: filteredItems,
    /** Unfiltered listing — used to resolve a guided booking target regardless of the marketplace's currently active date/tenant/search filters (US-0103). */
    allItems: rawItems,
    featuredItem,
    standardItems,
    tenantOptions,
    dateFrom,
    dateTo,
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
    refetch: load,
  };
}
