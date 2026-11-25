'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildCalendarCells } from '@/lib/portal/gestion-eventos-calendario';
import {
  addDaysKey,
  addMonthsKey,
  formatMesLabel,
  formatSemanaLabel,
  hoyKey,
  isKeyInRange,
  startOfMonthKey,
  startOfWeekKey,
} from '@/lib/portal/entrenamientos-calendario';
import type { EntrenamientosPeriodo, EntrenamientosVista } from '@/types/portal/entrenamientos.types';

type UseEntrenamientosCalendarOptions = {
  initialVista?: EntrenamientosVista;
};

export type EntrenamientosCalendarState = {
  vista: EntrenamientosVista;
  /** Changes view; `anchorDay` (a day key) pins the new period, e.g. "Ver detalle del día". */
  setVista: (vista: EntrenamientosVista, anchorDay?: string) => void;
  /** Bogotá day key the period is built around. */
  anchorKey: string;
  periodo: EntrenamientosPeriodo;
  /** Day shown by the agenda panel (Semana / Mes). */
  selectedDateKey: string | null;
  selectDate: (dateKey: string) => void;
  clearSelectedDate: () => void;
  goPrevious: () => void;
  goNext: () => void;
  goToday: () => void;
};

function buildPeriodo(vista: EntrenamientosVista, anchorKey: string): EntrenamientosPeriodo {
  if (vista === 'mes') {
    const monthStartDate = startOfMonthKey(anchorKey);
    const cells = buildCalendarCells(monthStartDate);
    return {
      from: cells[0].dateKey,
      to: cells[cells.length - 1].dateKey,
      label: formatMesLabel(monthStartDate),
      monthStartDate,
    };
  }

  const from = startOfWeekKey(anchorKey);
  const to = addDaysKey(from, 6);
  return { from, to, label: formatSemanaLabel(from, to), monthStartDate: null };
}

/**
 * Period state of the trainings calendar (US-0142): the view, the anchor day the week or month is
 * built around, and the day selected for the agenda panel. Week = Monday–Sunday; month = the
 * 42-cell grid, so adjacent-month days are loaded too.
 */
export function useEntrenamientosCalendar({ initialVista = 'semana' }: UseEntrenamientosCalendarOptions = {}): EntrenamientosCalendarState {
  const [vista, setVistaState] = useState<EntrenamientosVista>(initialVista);
  const [anchorKey, setAnchorKey] = useState<string>(() => hoyKey());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const periodo = useMemo(() => buildPeriodo(vista, anchorKey), [anchorKey, vista]);

  const setVista = useCallback(
    (next: EntrenamientosVista, anchorDay?: string) => {
      if (anchorDay) {
        setAnchorKey(anchorDay);
        setSelectedDateKey(anchorDay);
        setVistaState(next);
        return;
      }
      if (next === vista) return;
      // Month → week: show the week of the day the user was looking at.
      if (vista === 'mes') {
        const monthStart = startOfMonthKey(anchorKey);
        const enMes = selectedDateKey?.startsWith(monthStart.slice(0, 7));
        setAnchorKey(enMes && selectedDateKey ? selectedDateKey : monthStart);
      } else if (next === 'mes' && selectedDateKey) {
        setAnchorKey(selectedDateKey);
      }
      setVistaState(next);
    },
    [anchorKey, selectedDateKey, vista],
  );

  const move = useCallback(
    (direction: 1 | -1) => {
      setSelectedDateKey(null);
      setAnchorKey((current) =>
        vista === 'mes' ? addMonthsKey(startOfMonthKey(current), direction) : addDaysKey(startOfWeekKey(current), 7 * direction),
      );
    },
    [vista],
  );

  const goPrevious = useCallback(() => move(-1), [move]);
  const goNext = useCallback(() => move(1), [move]);

  const goToday = useCallback(() => {
    const today = hoyKey();
    setAnchorKey(today);
    setSelectedDateKey(today);
  }, []);

  const selectDate = useCallback(
    (dateKey: string) => {
      setSelectedDateKey(dateKey);
      // Keep the anchor inside the period when a day outside it is picked (never happens from the UI).
      if (!isKeyInRange(dateKey, periodo.from, periodo.to)) setAnchorKey(dateKey);
    },
    [periodo.from, periodo.to],
  );

  const clearSelectedDate = useCallback(() => setSelectedDateKey(null), []);

  return {
    vista,
    setVista,
    anchorKey,
    periodo,
    selectedDateKey,
    selectDate,
    clearSelectedDate,
    goPrevious,
    goNext,
    goToday,
  };
}
