'use client';

import { useMemo, useState } from 'react';

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function useEntrenamientosCalendar() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));

  const monthStart = useMemo(() => startOfMonth(selectedMonth), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(selectedMonth), [selectedMonth]);

  const range = useMemo(
    () => ({
      from: toDateOnly(monthStart),
      to: toDateOnly(monthEnd),
      label: formatMonthLabel(monthStart),
    }),
    [monthEnd, monthStart],
  );

  const goToNextMonth = () => {
    setSelectedMonth((current) => startOfMonth(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1))));
  };

  const goToPreviousMonth = () => {
    setSelectedMonth((current) => startOfMonth(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1))));
  };

  return {
    selectedMonth,
    range,
    goToNextMonth,
    goToPreviousMonth,
  };
}
