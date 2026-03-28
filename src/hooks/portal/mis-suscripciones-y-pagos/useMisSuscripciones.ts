'use client';

import { useMemo, useState, useCallback } from 'react';
import type {
  MiSuscripcionRow,
  SuscripcionEstado,
  PagoEstado,
} from '@/types/portal/mis-suscripciones-y-pagos.types';

type SuscripcionFilter = SuscripcionEstado | 'all';
type PagoFilter = PagoEstado | 'all';

type UseMisSuscripcionesResult = {
  suscripcionEstadoFilter: SuscripcionFilter;
  setSuscripcionEstadoFilter: (v: SuscripcionFilter) => void;
  pagoEstadoFilter: PagoFilter;
  setPagoEstadoFilter: (v: PagoFilter) => void;
  filteredSuscripciones: MiSuscripcionRow[];
  clearFilters: () => void;
};

export function useMisSuscripciones(
  initialData: MiSuscripcionRow[],
): UseMisSuscripcionesResult {
  const [suscripcionEstadoFilter, setSuscripcionEstadoFilter] =
    useState<SuscripcionFilter>('all');
  const [pagoEstadoFilter, setPagoEstadoFilter] = useState<PagoFilter>('all');

  const filteredSuscripciones = useMemo(() => {
    let result = initialData;

    if (suscripcionEstadoFilter !== 'all') {
      result = result.filter((s) => s.estado === suscripcionEstadoFilter);
    }

    if (pagoEstadoFilter !== 'all') {
      result = result.filter((s) => s.pago?.estado === pagoEstadoFilter);
    }

    return result;
  }, [initialData, suscripcionEstadoFilter, pagoEstadoFilter]);

  const clearFilters = useCallback(() => {
    setSuscripcionEstadoFilter('all');
    setPagoEstadoFilter('all');
  }, []);

  return {
    suscripcionEstadoFilter,
    setSuscripcionEstadoFilter,
    pagoEstadoFilter,
    setPagoEstadoFilter,
    filteredSuscripciones,
    clearFilters,
  };
}
