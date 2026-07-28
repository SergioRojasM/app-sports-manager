import type { PlanWithDisciplinas } from './planes.types';

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
};

export type UsePlanesPublicosResult = {
  loading: boolean;
  error: string | null;
  plans: PlanPublicoItem[];
  filteredPlans: PlanPublicoItem[];
  search: string;
  setSearch: (value: string) => void;
  retry: () => Promise<void>;
};
