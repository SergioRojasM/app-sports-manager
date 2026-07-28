'use client';

import { useMemo, useState, useCallback } from 'react';
import type {
  MiSuscripcionRow,
  SuscripcionEstado,
  PagoEstado,
} from '@/types/portal/mis-suscripciones.types';

type SuscripcionFilter = SuscripcionEstado | 'all';
type PagoFilter = PagoEstado | 'all';
type TenantFilter = string | 'all';

export type TenantOption = { id: string; nombre: string };

type UseMisSuscripcionesResult = {
  suscripcionEstadoFilter: SuscripcionFilter;
  setSuscripcionEstadoFilter: (v: SuscripcionFilter) => void;
  pagoEstadoFilter: PagoFilter;
  setPagoEstadoFilter: (v: PagoFilter) => void;
  tenantFilter: TenantFilter;
  setTenantFilter: (v: TenantFilter) => void;
  tenantOptions: TenantOption[];
  filteredSuscripciones: MiSuscripcionRow[];
  clearFilters: () => void;
};

export function useMisSuscripciones(
  initialData: MiSuscripcionRow[],
): UseMisSuscripcionesResult {
  const [suscripcionEstadoFilter, setSuscripcionEstadoFilter] =
    useState<SuscripcionFilter>('all');
  const [pagoEstadoFilter, setPagoEstadoFilter] = useState<PagoFilter>('all');
  const [tenantFilter, setTenantFilter] = useState<TenantFilter>('all');

  // One entry per organization present in the user's subscriptions
  const tenantOptions = useMemo(() => {
    const byId = new Map<string, string>();
    initialData.forEach((s) => {
      if (!byId.has(s.tenant_id)) byId.set(s.tenant_id, s.tenant_nombre);
    });
    return [...byId.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [initialData]);

  const filteredSuscripciones = useMemo(() => {
    let result = initialData;

    if (suscripcionEstadoFilter !== 'all') {
      result = result.filter((s) => s.estado === suscripcionEstadoFilter);
    }

    if (pagoEstadoFilter !== 'all') {
      result = result.filter((s) => s.pago?.estado === pagoEstadoFilter);
    }

    if (tenantFilter !== 'all') {
      result = result.filter((s) => s.tenant_id === tenantFilter);
    }

    return result;
  }, [initialData, suscripcionEstadoFilter, pagoEstadoFilter, tenantFilter]);

  const clearFilters = useCallback(() => {
    setSuscripcionEstadoFilter('all');
    setPagoEstadoFilter('all');
    setTenantFilter('all');
  }, []);

  return {
    suscripcionEstadoFilter,
    setSuscripcionEstadoFilter,
    pagoEstadoFilter,
    setPagoEstadoFilter,
    tenantFilter,
    setTenantFilter,
    tenantOptions,
    filteredSuscripciones,
    clearFilters,
  };
}
