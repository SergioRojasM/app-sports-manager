'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { planesService } from '@/services/supabase/portal/planes.service';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import type { Discipline } from '@/types/portal/disciplines.types';
import type { PlanWithDisciplinas, PlanTableItem, PlanTipo } from '@/types/portal/planes.types';

type UsePlanesViewOptions = {
  tenantId: string;
};

type UsePlanesViewResult = {
  loading: boolean;
  error: string | null;
  planes: PlanTableItem[];
  disciplines: Discipline[];
};

function toTableItem(plan: PlanWithDisciplinas, allDisciplines: Discipline[]): PlanTableItem {
  const status = plan.activo ? 'Activo' : 'Inactivo';
  const vigencia = plan.vigencia_meses === 1 ? '1 mes' : `${plan.vigencia_meses} meses`;

  const disciplinaNames = plan.disciplinas
    .map((id) => allDisciplines.find((d) => d.id === id)?.nombre)
    .filter((name): name is string => Boolean(name));

  return {
    ...plan,
    statusLabel: status,
    vigenciaLabel: vigencia,
    disciplinaNames,
  };
}

export function getActiveTipos(plan: PlanWithDisciplinas): PlanTipo[] {
  return (plan.plan_tipos ?? [])
    .filter((t) => t.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function usePlanesView({ tenantId }: UsePlanesViewOptions): UsePlanesViewResult {
  const [planes, setPlanes] = useState<PlanWithDisciplinas[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No active session');
      }

      const [planesData, disciplinesData] = await Promise.all([
        planesService.getPlanes(tenantId),
        disciplinesService.listDisciplinesByTenant(tenantId),
      ]);

      // Filter only active plans for non-admin view
      const activePlanes = planesData.filter((p) => p.activo);
      setPlanes(activePlanes);
      setDisciplines(disciplinesData);
    } catch {
      setPlanes([]);
      setDisciplines([]);
      setError('No fue posible cargar los planes de la organización.');
    } finally {
      setLoading(false);
    }
  }, [supabase, tenantId]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await loadData();
    };

    void execute();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  const tableItems = useMemo(
    () => planes.map((plan) => toTableItem(plan, disciplines)),
    [planes, disciplines],
  );

  return {
    loading,
    error,
    planes: tableItems,
    disciplines,
  };
}
