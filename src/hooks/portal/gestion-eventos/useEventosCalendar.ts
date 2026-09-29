'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { EventoServiceError, type EventoListItem } from '@/types/portal/eventos.types';
import {
  formatMonthLabel,
  getMonthRangeInBogota,
  shiftMonthStart,
  toDateKeyInBogota,
  toMonthStartInBogota,
} from '@/lib/portal/eventos.utils';

type UseEventosCalendarOptions = {
  tenantId: string;
  /** Only fetch while the calendar view is visible. */
  enabled: boolean;
  /** Client filters applied before events are placed on the grid. */
  filter?: (evento: EventoListItem) => boolean;
};

type UseEventosCalendarResult = {
  monthStartDate: string;
  monthLabel: string;
  eventosByDate: Record<string, EventoListItem[]>;
  selectedDateKey: string | null;
  selectedDayEventos: EventoListItem[];
  loading: boolean;
  error: string | null;
  goPrevious: () => void;
  goNext: () => void;
  selectDate: (dateKey: string) => void;
  reload: () => Promise<void>;
};

export function useEventosCalendar({ tenantId, enabled, filter }: UseEventosCalendarOptions): UseEventosCalendarResult {
  const [monthStartDate, setMonthStartDate] = useState(() => toMonthStartInBogota(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventosService.listEventos(tenantId, getMonthRangeInBogota(monthStartDate));
      setEventos(data);
    } catch (err) {
      console.error('Failed to load eventos calendar month:', err);
      setError(err instanceof EventoServiceError ? err.message : 'No se pudieron cargar los eventos del mes.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, monthStartDate]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const eventosByDate = useMemo(
    () =>
      eventos.reduce<Record<string, EventoListItem[]>>((accumulator, evento) => {
        if (!evento.fechaHora || (filter && !filter(evento))) return accumulator;
        const dateKey = toDateKeyInBogota(evento.fechaHora);
        accumulator[dateKey] = [...(accumulator[dateKey] ?? []), evento];
        return accumulator;
      }, {}),
    [eventos, filter],
  );

  const goPrevious = useCallback(() => {
    setMonthStartDate((current) => shiftMonthStart(current, -1));
    setSelectedDateKey(null);
  }, []);

  const goNext = useCallback(() => {
    setMonthStartDate((current) => shiftMonthStart(current, 1));
    setSelectedDateKey(null);
  }, []);

  return {
    monthStartDate,
    monthLabel: formatMonthLabel(monthStartDate),
    eventosByDate,
    selectedDateKey,
    selectedDayEventos: selectedDateKey ? eventosByDate[selectedDateKey] ?? [] : [],
    loading,
    error,
    goPrevious,
    goNext,
    selectDate: setSelectedDateKey,
    reload,
  };
}
