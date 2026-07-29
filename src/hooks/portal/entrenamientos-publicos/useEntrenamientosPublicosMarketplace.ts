'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { entrenamientosPublicosService } from '@/services/supabase/portal/entrenamientos-publicos.service';
import type { PublicTrainingDateChip, PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';

function startOfWeek(reference: Date): Date {
  const day = reference.getDay();
  const diff = (day + 6) % 7; // Monday-based week
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function matchesDateChip(fechaHora: string | null, dateChip: PublicTrainingDateChip | null): boolean {
  if (!dateChip || !fechaHora) {
    return true;
  }

  const value = new Date(fechaHora);
  const now = new Date();

  if (dateChip === 'today') {
    return value.toDateString() === now.toDateString();
  }

  if (dateChip === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return value.toDateString() === tomorrow.toDateString();
  }

  if (dateChip === 'this_week') {
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return value >= weekStart && value < weekEnd;
  }

  if (dateChip === 'weekend') {
    return isWeekend(value);
  }

  return true;
}

function isWithinCurrentWeek(fechaHora: string | null): boolean {
  if (!fechaHora) return false;
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const value = new Date(fechaHora);
  return value >= weekStart && value < weekEnd;
}

export function useEntrenamientosPublicosMarketplace() {
  const [items, setItems] = useState<PublicTrainingListItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateChip, setDateChip] = useState<PublicTrainingDateChip | null>('this_week');
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
      setItems(trainings);
      setTenantOptions(tenants);
    } catch {
      setItems([]);
      setError('No fue posible cargar los entrenamientos públicos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items
      .filter((item) => matchesDateChip(item.fechaHora, dateChip))
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
  }, [items, dateChip, tenantId, search]);

  const thisWeekCount = useMemo(() => items.filter((item) => isWithinCurrentWeek(item.fechaHora)).length, [items]);

  const featuredItem = filteredItems[0] ?? null;
  const standardItems = filteredItems.slice(1);

  return {
    loading,
    error,
    items: filteredItems,
    featuredItem,
    standardItems,
    tenantOptions,
    thisWeekCount,
    dateChip,
    setDateChip,
    search,
    setSearch,
    tenantId,
    setTenantId,
    refetch: load,
  };
}
