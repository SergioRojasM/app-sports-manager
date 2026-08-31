import type { PlanWithDisciplinas } from './planes.types';
import type { TenantRole } from './tenant.types';

/** One service granted by a public plan subtype. `unidades: null` means unlimited. */
export type PlanPublicoServicioItem = {
  servicioId: string;
  servicioNombre: string;
  unidades: number | null;
};

/** An active subtype of a public plan, as rendered in the catalog. */
export type PlanPublicoTipoItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  vigencia_dias: number;
  servicios: PlanPublicoServicioItem[];
};

/**
 * A public plan card in the catalog. Extends the domain plan (same idiom as
 * `PlanTableItem`) so it can be handed straight to the existing `useSuscripcion`
 * acquisition flow, with display-ready fields added on top.
 */
export type PlanPublicoItem = PlanWithDisciplinas & {
  beneficiosList: string[];
  disciplinaNames: string[];
  tipos: PlanPublicoTipoItem[];
  /**
   * True for a plan that is NOT `es_publico` — only visible here because the viewer is a
   * member of the organization (US-0111). Drives the "Solo miembros" badge.
   */
  esExclusivoMiembro: boolean;
};

export type UsePlanesPublicosResult = {
  loading: boolean;
  error: string | null;
  /** The viewer belongs to the tenant, so the catalog also lists its member-only plans. */
  esMiembro: boolean;
  /** The viewer's role inside the tenant, `null` for non-members. */
  role: TenantRole | null;
  plans: PlanPublicoItem[];
  filteredPlans: PlanPublicoItem[];
  search: string;
  setSearch: (value: string) => void;
  retry: () => Promise<void>;
};
