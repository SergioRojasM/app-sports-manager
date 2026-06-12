'use client';

import { useCallback, useEffect, useState } from 'react';
import { serviciosService } from '@/services/supabase/portal/servicios.service';
import type { Servicio, PlanTipoServicioRow } from '@/types/portal/servicios.types';

type UsePlanTipoServiciosOptions = {
  tenantId: string;
};

export function usePlanTipoServicios({ tenantId }: UsePlanTipoServiciosOptions) {
  const [availableServices, setAvailableServices] = useState<Servicio[]>([]);
  const [serviceRows, setServiceRows] = useState<PlanTipoServicioRow[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Load active services for the dropdown on mount
  useEffect(() => {
    setIsLoadingServices(true);
    serviciosService
      .getServiciosActivosByTenant(tenantId)
      .then((data) => setAvailableServices(data))
      .catch(() => setAvailableServices([]))
      .finally(() => setIsLoadingServices(false));
  }, [tenantId]);

  /** Load existing service assignments for a plan tipo (edit mode) */
  const loadForPlanTipo = useCallback(async (planTipoId: string) => {
    try {
      const data = await serviciosService.getPlanTipoServicios(planTipoId);
      setServiceRows(data.map((s) => ({ servicioId: s.servicio_id, unidades: s.unidades })));
    } catch {
      setServiceRows([]);
    }
  }, []);

  /** Reset rows (used when opening create mode) */
  const resetRows = useCallback(() => {
    setServiceRows([]);
  }, []);

  /** Add a blank row; skips if all available services are already selected */
  const addServiceRow = useCallback(() => {
    const selectedIds = new Set(serviceRows.map((r) => r.servicioId));
    const hasUnselected = availableServices.some((s) => !selectedIds.has(s.id));
    if (!hasUnselected) return;
    setServiceRows((prev) => [...prev, { servicioId: '', unidades: 1 }]);
  }, [availableServices, serviceRows]);

  /** Update a row at the given index */
  const updateServiceRow = useCallback((index: number, partial: Partial<PlanTipoServicioRow>) => {
    setServiceRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  }, []);

  /** Remove a row at the given index */
  const removeServiceRow = useCallback((index: number) => {
    setServiceRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Persist current rows to the DB for a given plan tipo */
  const syncToDb = useCallback(
    async (planTipoId: string): Promise<void> => {
      await serviciosService.syncPlanTipoServicios(planTipoId, serviceRows);
    },
    [serviceRows],
  );

  /** Whether all available services are already selected (disables add button) */
  const allServicesSelected =
    availableServices.length > 0 &&
    serviceRows.filter((r) => r.servicioId).length >= availableServices.length;

  return {
    availableServices,
    serviceRows,
    isLoadingServices,
    allServicesSelected,
    loadForPlanTipo,
    resetRows,
    addServiceRow,
    updateServiceRow,
    removeServiceRow,
    syncToDb,
  };
}
