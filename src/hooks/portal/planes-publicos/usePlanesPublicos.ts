'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { planesService } from '@/services/supabase/portal/planes.service';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import { getActiveTipos } from '@/hooks/portal/planes/usePlanesView';
import type { Discipline } from '@/types/portal/disciplines.types';
import type { PlanWithDisciplinas } from '@/types/portal/planes.types';
import type {
  PlanPublicoItem,
  PlanPublicoTipoItem,
  UsePlanesPublicosResult,
} from '@/types/portal/planes-publicos.types';

type UsePlanesPublicosOptions = {
  tenantId: string;
  enabled?: boolean;
};

/** Lowercases and strips diacritics so "Natacion" matches "Natación". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function splitBeneficios(beneficios: string | null): string[] {
  if (!beneficios) return [];
  return beneficios
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toCatalogItem(plan: PlanWithDisciplinas, allDisciplines: Discipline[]): PlanPublicoItem {
  const tipos: PlanPublicoTipoItem[] = getActiveTipos(plan).map((tipo) => ({
    id: tipo.id,
    nombre: tipo.nombre,
    descripcion: tipo.descripcion,
    precio: tipo.precio,
    vigencia_dias: tipo.vigencia_dias,
    servicios: (tipo.servicios ?? []).map((servicio) => ({
      servicioId: servicio.servicioId,
      servicioNombre: servicio.servicioNombre ?? '',
      unidades: servicio.unidades,
    })),
  }));

  return {
    ...plan,
    beneficiosList: splitBeneficios(plan.beneficios),
    disciplinaNames: plan.disciplinas
      .map((id) => allDisciplines.find((discipline) => discipline.id === id)?.nombre)
      .filter((name): name is string => Boolean(name)),
    tipos,
  };
}

/** A plan matches when the term hits the plan itself, any subtype or any granted service. */
function matchesSearch(plan: PlanPublicoItem, term: string): boolean {
  const haystack = [
    plan.nombre,
    plan.descripcion ?? '',
    plan.tipo ?? '',
    ...plan.beneficiosList,
    ...plan.disciplinaNames,
    ...plan.tipos.flatMap((tipo) => [
      tipo.nombre,
      tipo.descripcion ?? '',
      ...tipo.servicios.map((servicio) => servicio.servicioNombre),
    ]),
  ];

  return haystack.some((value) => normalize(value).includes(term));
}

export function usePlanesPublicos({
  tenantId,
  enabled = true,
}: UsePlanesPublicosOptions): UsePlanesPublicosResult {
  const [plans, setPlans] = useState<PlanPublicoItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [planesData, disciplinesData] = await Promise.all([
        planesService.getPlanesPublicos(tenantId),
        disciplinesService.listDisciplinesByTenant(tenantId),
      ]);

      setPlans(planesData.map((plan) => toCatalogItem(plan, disciplinesData)));
    } catch {
      setPlans([]);
      setError('No fue posible cargar los planes públicos de esta organización.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await loadData();
    };

    void execute();

    return () => {
      mounted = false;
    };
  }, [enabled, loadData]);

  const filteredPlans = useMemo(() => {
    const term = normalize(search.trim());
    if (term.length === 0) return plans;

    return plans.filter((plan) => matchesSearch(plan, term));
  }, [plans, search]);

  return {
    loading,
    error,
    plans,
    filteredPlans,
    search,
    setSearch,
    retry: loadData,
  };
}
