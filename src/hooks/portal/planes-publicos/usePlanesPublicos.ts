'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { planesService } from '@/services/supabase/portal/planes.service';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import { tenantService } from '@/services/supabase/portal/tenant.service';
import { getActiveTipos } from '@/hooks/portal/planes/usePlanesView';
import type { Discipline } from '@/types/portal/disciplines.types';
import type { PlanWithDisciplinas } from '@/types/portal/planes.types';
import type { TenantRole } from '@/types/portal/tenant.types';
import type {
  PlanPublicoItem,
  PlanPublicoTipoItem,
  UsePlanesPublicosResult,
} from '@/types/portal/planes-publicos.types';

type UsePlanesPublicosOptions = {
  tenantId: string;
  enabled?: boolean;
  /** Seeds the search term's initial state (US-0101) — callers that need to re-apply it on every reopen (the component isn't remounted between opens) do so via setSearch. */
  initialSearch?: string;
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
    esExclusivoMiembro: !plan.es_publico,
  };
}

/**
 * Membership decides WHICH catalog query runs, so it is resolved as part of the same
 * load instead of by a separate hook: one `loading` flag, no first paint of the
 * public-only catalog followed by a second, wider fetch.
 *
 * Fails closed (`esMiembro: false` → public catalog only) on any error; RLS remains the
 * authoritative gate on both reading and buying a member-only plan.
 */
async function resolveMembership(tenantId: string): Promise<{ esMiembro: boolean; role: TenantRole | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { esMiembro: false, role: null };

    const decision = await tenantService.canUserAccessTenant(supabase, user.id, tenantId);
    return { esMiembro: decision.allowed, role: decision.role };
  } catch {
    return { esMiembro: false, role: null };
  }
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
  initialSearch = '',
}: UsePlanesPublicosOptions): UsePlanesPublicosResult {
  const [plans, setPlans] = useState<PlanPublicoItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [esMiembro, setEsMiembro] = useState(false);
  const [role, setRole] = useState<TenantRole | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const membership = await resolveMembership(tenantId);

      const [planesData, disciplinesData] = await Promise.all([
        // A member of the organization gets its full active catalog — the plans that
        // grant the service a booking is missing are often member-only (US-0111).
        membership.esMiembro
          ? planesService.getPlanesMiembro(tenantId)
          : planesService.getPlanesPublicos(tenantId),
        disciplinesService.listDisciplinesByTenant(tenantId),
      ]);

      setEsMiembro(membership.esMiembro);
      setRole(membership.role);
      setPlans(planesData.map((plan) => toCatalogItem(plan, disciplinesData)));
    } catch {
      setPlans([]);
      setError('No fue posible cargar los planes de esta organización.');
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
    esMiembro,
    role,
    plans,
    filteredPlans,
    search,
    setSearch,
    retry: loadData,
  };
}
