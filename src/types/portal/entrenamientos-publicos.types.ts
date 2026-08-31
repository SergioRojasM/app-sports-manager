/** One row of the publication's schedule. Array order is display order (US-0109). */
export type CronogramaItem = {
  hora: string;
  descripcion: string;
};

/** One "what's included" entry shown as a checklist item (US-0109). */
export type IncluyeItem = {
  titulo: string;
  descripcion: string;
};

/** One pricing option. A publication may have zero (Gratis), one, or many (US-0109). */
export type PrecioItem = {
  nombre: string;
  precio: number;
  descripcion: string | null;
};

export type EntrenamientoPublico = {
  id: string;
  tenant_id: string;
  entrenamiento_id: string;
  nombre: string | null;
  descripcion: string | null;
  disciplina_id: string;
  escenario_id: string;
  entrenador_id: string | null;
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  punto_encuentro: string | null;
  estado: string;
  reserva_antelacion_horas: number | null;
  cancelacion_antelacion_horas: number | null;
  /** Pricing options. Empty array means the training is free (US-0109). */
  precio: PrecioItem[];
  /** Long-form Markdown description rendered on the public detail page (US-0109). */
  descripcion_larga: string | null;
  /** Admin-authored link to the organization's own event page (US-0109). */
  pagina_evento_url: string | null;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  banner_url: string | null;
  activo: boolean;
  publicado_por: string | null;
  /** When true, a booking rejected only for a missing plan/service may proceed as pending (US-0106). */
  omitir_confirmacion_plan: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicarEntrenamientoInput = {
  tenantId: string;
  entrenamientoId: string;
  nombre: string;
  descripcion: string | null;
  precio: PrecioItem[];
  descripcionLarga: string | null;
  paginaEventoUrl: string | null;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  banner_url: string | null;
  omitirConfirmacionPlan: boolean;
};

/**
 * A price row while it is being edited. The amount stays a raw string so an
 * emptied input can be rejected as invalid, instead of `Number('')` silently
 * coercing it to 0 and publishing the option as free (US-0109). Converted to a
 * numeric `PrecioItem` on submit.
 */
export type PrecioFormRow = {
  nombre: string;
  precio: string;
  descripcion: string;
};

export type EntrenamientoPublicoFormValues = {
  nombre: string;
  descripcion: string;
  precio: PrecioFormRow[];
  descripcionLarga: string;
  paginaEventoUrl: string;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  omitirConfirmacionPlan: boolean;
};

export type PublicTrainingListItem = {
  id: string;
  tenantId: string;
  tenantNombre: string;
  tenantLogoUrl: string | null;
  entrenamientoId: string;
  nombre: string;
  descripcion: string | null;
  disciplinaId: string;
  disciplinaNombre: string;
  escenarioNombre: string;
  escenarioUbicacion: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  puntoEncuentro: string | null;
  reservaAntelacionHoras: number | null;
  cancelacionAntelacionHoras: number | null;
  /** Pricing options. Empty array means the training is free (US-0109). */
  precio: PrecioItem[];
  /** Long-form Markdown description, rendered on the detail page only (US-0109). */
  descripcionLarga: string | null;
  /** Admin-authored official event page URL; drives the secondary detail CTA (US-0109). */
  paginaEventoUrl: string | null;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  /** Resolved entrenador display name, null when the publication has no entrenador_id (US-0109). */
  entrenadorNombre: string | null;
  bannerUrl: string | null;
  reservasActivas: number;
  /** Distinct names of services the training requires, alphabetical. Empty when unrestricted (US-0094). */
  serviciosRequeridos: string[];
  /** When true, a booking rejected only for a missing plan/service may proceed as pending (US-0106). */
  omitirConfirmacionPlan: boolean;
  createdAt: string;
  /** Source entrenamientos.formulario_id, batched in listPublicTrainings() (US-0101). Null on the anonymous landing page. */
  formularioId: string | null;
  /** Source entrenamientos.formulario_externo, batched in listPublicTrainings() (US-0101). Null on the anonymous landing page. */
  formularioExterno: string | null;
};

export type PublicTrainingDateChip = 'today' | 'tomorrow' | 'this_week' | 'weekend';

export type PublicTrainingFilters = {
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
  tenantId: string | null;
};

export type EntrenamientoPublicoServiceErrorCode =
  | 'membership_restriction'
  | 'duplicate'
  | 'fk_dependency'
  | 'forbidden'
  | 'validation'
  | 'unknown';

export class EntrenamientoPublicoServiceError extends Error {
  code: EntrenamientoPublicoServiceErrorCode;

  constructor(code: EntrenamientoPublicoServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'EntrenamientoPublicoServiceError';
  }
}
