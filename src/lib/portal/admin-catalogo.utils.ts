// Pure helpers of the organization admin module (grit-arena-v3 `aYwNn`, `qG0T5`, `fXuVP`, `v8mqZG`, `J7Lw7d`).
// No React, no Supabase: everything here is derived from rows the hooks already loaded.

import { formatCop } from '@/lib/portal/eventos.utils';
import type { ReglaNotificacion } from '@/types/portal/reglas-notificacion.types';

/** Lowercase, accent-free, trimmed — for search and for grouping free-text values. */
export function normalizarTexto(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

/** True when every word of the query is contained in one of the values (accent- and case-insensitive). */
export function coincideBusqueda(query: string, values: Array<string | null | undefined>): boolean {
  const q = normalizarTexto(query);
  if (!q) return true;
  const haystack = values.map(normalizarTexto).join(' ');
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

// ---------------------------------------------------------------------------
// Notification rules timeline (`aYwNn` `qiyOL`)
// ---------------------------------------------------------------------------

/**
 * Chronological order around the expiry date: "before" rules from the furthest to the closest
 * day, then "after" rules from the closest to the furthest.
 */
export function ordenarReglasTimeline(reglas: ReglaNotificacion[]): ReglaNotificacion[] {
  const pre = reglas.filter((r) => r.tipo === 'vencimiento_pre').sort((a, b) => b.dias - a.dias);
  const pos = reglas.filter((r) => r.tipo === 'vencimiento_pos').sort((a, b) => a.dias - b.dias);
  return [...pre, ...pos];
}

/** "1 día" / "N días". */
export function formatDias(dias: number): string {
  return dias === 1 ? '1 día' : `${dias} días`;
}

// ---------------------------------------------------------------------------
// Scenarios (`qG0T5`)
// ---------------------------------------------------------------------------

type EscenarioResumible = {
  tipo: string;
  capacidad: number | null;
  schedules: Array<{ disponible: boolean }>;
};

export type ScenarioTipoOption = {
  /** Normalised key (`normalizarTexto(tipo)`), used as the filter value. */
  value: string;
  /** Most frequent original spelling (trimmed). */
  label: string;
  count: number;
};

/** Above this many groups the type filter becomes a dropdown instead of segmented buttons. */
export const MAX_TIPOS_SEGMENTED = 5;

/**
 * Groups the free-text `tipo` of the scenarios case- and accent-insensitively ("Piscina",
 * "piscina " → one group labelled with the most used spelling), sorted by count desc, then label.
 */
export function agruparTiposEscenario(escenarios: Array<{ tipo: string }>): ScenarioTipoOption[] {
  const groups = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const { tipo } of escenarios) {
    const key = normalizarTexto(tipo);
    if (!key) continue;
    const group = groups.get(key) ?? { count: 0, spellings: new Map<string, number>() };
    group.count += 1;
    const spelling = tipo.trim();
    group.spellings.set(spelling, (group.spellings.get(spelling) ?? 0) + 1);
    groups.set(key, group);
  }
  return Array.from(groups, ([value, group]) => {
    // Most used spelling; on a tie prefer a capitalised one ("Running" over "running")
    const capitalised = (value: string) => (value.charAt(0) !== value.charAt(0).toLocaleLowerCase('es') ? 0 : 1);
    const label = Array.from(group.spellings).sort(
      (a, b) => b[1] - a[1] || capitalised(a[0]) - capitalised(b[0]) || a[0].localeCompare(b[0], 'es'),
    )[0][0];
    return { value, label, count: group.count };
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));
}

/** "N cupos totales" (sum of capacities, empty ones ignored) and "N horarios activos". */
export function resumenEscenarios(escenarios: EscenarioResumible[]): { cupos: number; horariosActivos: number } {
  return escenarios.reduce(
    (acc, e) => ({
      cupos: acc.cupos + (e.capacidad ?? 0),
      horariosActivos: acc.horariosActivos + e.schedules.filter((s) => s.disponible).length,
    }),
    { cupos: 0, horariosActivos: 0 },
  );
}

/**
 * Map link of a scenario: `coordenadas` as-is when it already is a map URL (Waze / Google links are
 * stored there), otherwise a Google Maps search for the coordinates (preferred) or the address;
 * null when neither exists.
 */
export function mapaEscenarioUrl(e: { coordenadas: string | null; direccion: string | null }): string | null {
  const coordenadas = e.coordenadas?.trim();
  if (coordenadas && /^https?:\/\//i.test(coordenadas)) return coordenadas;
  const query = coordenadas || e.direccion?.trim();
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

/** "1 horario" / "N horarios" / "Sin horarios". */
export function formatHorarios(n: number): string {
  if (n === 0) return 'Sin horarios';
  return n === 1 ? '1 horario' : `${n} horarios`;
}

// ---------------------------------------------------------------------------
// Disciplines and levels (`fXuVP`)
// ---------------------------------------------------------------------------

/** Next free ladder position (max `orden` + 1, or 1). */
export function siguienteOrden(niveles: Array<{ orden: number }>): number {
  return niveles.length === 0 ? 1 : Math.max(...niveles.map((n) => n.orden)) + 1;
}

/** "01", "02", … */
export function formatPosicion(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/** "1 atleta" / "N atletas" / "—" when the count is unknown. */
export function formatAtletas(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n === 1 ? '1 atleta' : `${n} atletas`;
}

export type SegmentoDistribucion = { id: string; nombre: string; count: number; pct: number };

/**
 * Athletes per level as proportional segments (percentages of the total) and the text alternative
 * "Principiante 18, Intermedio 14, Avanzado 6". Levels keep the order they are given in.
 */
export function distribucionNiveles(
  niveles: Array<{ id: string; nombre: string }>,
  porNivel: Record<string, number>,
): { segmentos: SegmentoDistribucion[]; total: number; texto: string } {
  const counts = niveles.map((n) => ({ id: n.id, nombre: n.nombre, count: porNivel[n.id] ?? 0 }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  return {
    segmentos: counts.map((c) => ({ ...c, pct: total === 0 ? 0 : (c.count / total) * 100 })),
    total,
    texto: counts.map((c) => `${c.nombre} ${c.count}`).join(', '),
  };
}

// ---------------------------------------------------------------------------
// Services (`v8mqZG`)
// ---------------------------------------------------------------------------

type PlanConServicios = {
  id: string;
  plan_tipos?: Array<{ servicios?: Array<{ servicioId: string }> }>;
};

/**
 * Distinct plans whose subtypes (active or not — the same rows that block a service delete)
 * include each service: `{ [servicioId]: number of plans }`.
 */
export function contarPlanesPorServicio(planes: PlanConServicios[]): Record<string, number> {
  const planesPorServicio = new Map<string, Set<string>>();
  for (const plan of planes) {
    for (const tipo of plan.plan_tipos ?? []) {
      for (const { servicioId } of tipo.servicios ?? []) {
        const set = planesPorServicio.get(servicioId) ?? new Set<string>();
        set.add(plan.id);
        planesPorServicio.set(servicioId, set);
      }
    }
  }
  return Object.fromEntries(Array.from(planesPorServicio, ([id, set]) => [id, set.size]));
}

/** "1 plan" / "N planes" (the count itself is rendered apart, in the bubble). */
export function planesLabel(n: number): string {
  return n === 1 ? 'plan' : 'planes';
}

// ---------------------------------------------------------------------------
// Plans (`J7Lw7d`)
// ---------------------------------------------------------------------------

type PlanCardSource = {
  tipo: 'virtual' | 'presencial' | 'mixto' | null;
  beneficios: string | null;
  activo: boolean;
  es_publico: boolean;
  visible_atletas: boolean;
  plan_tipos?: Array<{
    id: string;
    nombre: string;
    precio: number;
    vigencia_dias: number;
    activo: boolean;
    servicios?: Array<{ servicioId: string; servicioNombre?: string }>;
  }>;
};

export type PlanVisibilidad = 'publico' | 'privado' | 'oculto';

export type PlanCardModel = {
  modalidadLabel: string | null;
  /** oculto (not visible to athletes) wins over público / privado. */
  visibilidad: PlanVisibilidad;
  activo: boolean;
  /** Cheapest active subtype, or null ("Sin precio"). */
  precio: { valor: string; vigencia: string } | null;
  /** Active subtypes by price: the first as "Nombre · N d", the others as "Nombre · $precio". */
  subtipos: Array<{ id: string; label: string }>;
  /** Distinct service names of the active subtypes, sorted. */
  servicios: string[];
  /** `beneficios` split on "|". */
  beneficios: string[];
};

const MODALIDAD_LABELS = { virtual: 'Virtual', presencial: 'Presencial', mixto: 'Mixto' } as const;

/** View model of a plan card, from the plan and its embedded subtypes (no extra query). */
export function buildPlanCardModel(plan: PlanCardSource): PlanCardModel {
  const activos = (plan.plan_tipos ?? []).filter((t) => t.activo).sort((a, b) => a.precio - b.precio || a.nombre.localeCompare(b.nombre, 'es'));
  const servicios = new Set<string>();
  for (const tipo of activos) {
    for (const servicio of tipo.servicios ?? []) {
      if (servicio.servicioNombre) servicios.add(servicio.servicioNombre);
    }
  }
  const cheapest = activos[0];
  return {
    modalidadLabel: plan.tipo ? MODALIDAD_LABELS[plan.tipo] : null,
    visibilidad: !plan.visible_atletas ? 'oculto' : plan.es_publico ? 'publico' : 'privado',
    activo: plan.activo,
    precio: cheapest ? { valor: formatCop(cheapest.precio), vigencia: `/ ${cheapest.vigencia_dias} d` } : null,
    subtipos: activos.map((t, index) => ({
      id: t.id,
      label: index === 0 ? `${t.nombre} · ${t.vigencia_dias} d` : `${t.nombre} · ${formatCop(t.precio)}`,
    })),
    servicios: Array.from(servicios).sort((a, b) => a.localeCompare(b, 'es')),
    beneficios: (plan.beneficios ?? '')
      .split('|')
      .map((b) => b.trim())
      .filter(Boolean),
  };
}
