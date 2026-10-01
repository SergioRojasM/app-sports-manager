import type { MetodoPagoTipo } from '@/types/portal/metodos-pago.types';

/** One row of the event's schedule. Array order is display order. */
export type CronogramaItem = {
  hora: string;
  descripcion: string;
};

/** One "what's included" entry shown as a checklist item. */
export type IncluyeItem = {
  titulo: string;
  descripcion: string;
};

/** One pricing option. An event may have zero (Gratis), one, or many. */
export type PrecioItem = {
  nombre: string;
  precio: number;
  descripcion: string | null;
};

export type EventoEstado = 'confirmado' | 'cancelado';

export const EVENTO_ESTADOS: readonly EventoEstado[] = ['confirmado', 'cancelado'] as const;

export const EVENTO_ESTADO_LABELS: Record<EventoEstado, string> = {
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
};

/** Venue captured when the event was saved (US-0119). Not an FK: renaming or deleting the venue leaves it intact. */
export type EventoEscenarioSnapshot = {
  id: string;
  nombre: string;
  tipo: string;
  ubicacion: string | null;
  direccion: string | null;
  coordenadas: string | null;
  capacidad: number | null;
  image_url: string | null;
};

/** Trainer captured when the event was saved, with event-specific experience text (US-0119). */
export type EventoEntrenadorSnapshot = {
  id: string;
  nombre: string;
  experiencia: string;
};

/** Payment method accepted for the event, copied from `tenant_metodos_pago` (US-0119). */
export type EventoMetodoPagoSnapshot = {
  id: string;
  nombre: string;
  tipo: MetodoPagoTipo;
  valor: string | null;
  url: string | null;
  comentarios: string | null;
};

/** One row of `public.eventos` (US-0118; snapshots and drafts added in US-0119). */
export type Evento = {
  id: string;
  tenant_id: string;
  /** Tenant name snapshot, set by `guardar_evento_completo` on create only (US-0120). */
  nombre_tenant: string;
  nombre: string;
  descripcion: string | null;
  /** Discipline NAME snapshot. Null only while `borrador`. */
  disciplina_id: string | null;
  escenario_id: EventoEscenarioSnapshot | null;
  entrenador_id: EventoEntrenadorSnapshot[];
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  punto_encuentro: string | null;
  estado: EventoEstado;
  reserva_antelacion_horas: number | null;
  cancelacion_antelacion_horas: number | null;
  /** Derived from the complete tickets by `guardar_evento_completo`. Empty array means free (or, for drafts, undefined). */
  precio: PrecioItem[];
  banner_url: string | null;
  activo: boolean;
  publico: boolean;
  borrador: boolean;
  formulario_id: string | null;
  metodos_pago: EventoMetodoPagoSnapshot[];
  creado_por: string | null;
  omitir_confirmacion_compra: boolean;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  descripcion_larga: string | null;
  pagina_evento_url: string | null;
  created_at: string;
  updated_at: string;
};

export type EventoEntradaTipo = 'sencilla' | 'multiple';

export const EVENTO_ENTRADA_TIPO_LABELS: Record<EventoEntradaTipo, string> = {
  sencilla: 'Sencilla',
  multiple: 'Múltiple',
};

/** One row of `public.evento_entrada_cupones`. Nullable fields may only be missing while the event is a draft. */
export type EventoEntradaCupon = {
  id: string;
  entrada_id: string;
  evento_id: string;
  tenant_id: string;
  nombre: string | null;
  cupon: string | null;
  /** Percentage, (0, 100]. */
  descuento: number | null;
  valido_desde: string | null;
  valido_hasta: string | null;
  created_at: string;
  updated_at: string;
};

/** One row of `public.evento_entradas`. Nullable fields may only be missing while the event is a draft. */
export type EventoEntrada = {
  id: string;
  evento_id: string;
  tenant_id: string;
  tipo_entrada: EventoEntradaTipo;
  nombre: string | null;
  eventos_id_bundle: string[];
  valida_desde: string | null;
  valida_hasta: string | null;
  valor: number | null;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type EventoEntradaConCupones = EventoEntrada & { cupones: EventoEntradaCupon[] };

export type EventoCompleto = Evento & {
  entradas: EventoEntradaConCupones[];
};

/** `p_evento` of `guardar_evento_completo` (snake_case, event columns only). */
export type GuardarEventoPayloadEvento = {
  nombre: string;
  descripcion: string | null;
  disciplina_id: string | null;
  escenario_id: EventoEscenarioSnapshot | null;
  entrenador_id: EventoEntrenadorSnapshot[];
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  punto_encuentro: string | null;
  reserva_antelacion_horas: number | null;
  cancelacion_antelacion_horas: number | null;
  banner_url: string | null;
  activo: boolean;
  publico: boolean;
  omitir_confirmacion_compra: boolean;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  descripcion_larga: string | null;
  pagina_evento_url: string | null;
  formulario_id: string | null;
  metodos_pago: EventoMetodoPagoSnapshot[];
};

export type GuardarEventoPayloadCupon = {
  client_key: string;
  id: string | null;
  nombre: string | null;
  cupon: string | null;
  descuento: number | null;
  valido_desde: string | null;
  valido_hasta: string | null;
};

export type GuardarEventoPayloadEntrada = {
  client_key: string;
  id: string | null;
  tipo_entrada: EventoEntradaTipo;
  nombre: string | null;
  eventos_id_bundle: string[];
  valida_desde: string | null;
  valida_hasta: string | null;
  valor: number | null;
  orden: number;
  cupones: GuardarEventoPayloadCupon[];
};

export type GuardarEventoPayload = {
  evento: GuardarEventoPayloadEvento;
  entradas: GuardarEventoPayloadEntrada[];
};

/** Result of a save: persisted ids keyed by the client row keys, so later saves update instead of insert. */
export type GuardarEventoResult = {
  eventoId: string;
  borrador: boolean;
  entradas: { clientKey: string; id: string; cupones: { clientKey: string; id: string }[] }[];
};

// ─── Wizard draft (in-memory form state, US-0119) ───

export type EventoWizardStep = 1 | 2 | 3;

export const EVENTO_WIZARD_STEPS: readonly { step: EventoWizardStep; label: string; icon: string }[] = [
  { step: 1, label: 'Configura tu evento', icon: 'edit_calendar' },
  { step: 2, label: 'Configura tus entradas', icon: 'confirmation_number' },
  { step: 3, label: 'Configura tus métodos de pago', icon: 'payments' },
] as const;

/** Coupon row while editing. `clientKey` is stable for the row's lifetime; `id` is set once persisted. */
export type EventoCuponDraft = {
  clientKey: string;
  id: string | null;
  nombre: string;
  cupon: string;
  /** Raw input, so an emptied field is "missing" rather than 0. */
  descuento: string;
  /** `YYYY-MM-DDTHH:mm` in Bogotá, or ''. */
  validoDesde: string;
  validoHasta: string;
};

export type EventoEntradaDraft = {
  clientKey: string;
  id: string | null;
  tipoEntrada: EventoEntradaTipo;
  nombre: string;
  eventosIdBundle: string[];
  /** Raw input, so an emptied field is "missing" rather than 0 (same rule as PrecioFormRow). */
  valor: string;
  validaDesde: string;
  validaHasta: string;
  cupones: EventoCuponDraft[];
};

export type EventoDraft = {
  nombre: string;
  descripcion: string;
  descripcionLarga: string;
  paginaEventoUrl: string;
  bannerUrl: string | null;
  disciplina: string;
  /** `YYYY-MM-DDTHH:mm` in Bogotá, or ''. */
  fechaHora: string;
  duracionMinutos: string;
  escenario: EventoEscenarioSnapshot | null;
  puntoEncuentro: string;
  entrenadores: EventoEntrenadorSnapshot[];
  cupoMaximo: string;
  reservaAntelacionHoras: string;
  cancelacionAntelacionHoras: string;
  omitirConfirmacionCompra: boolean;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  publico: boolean;
  activo: boolean;
  entradas: EventoEntradaDraft[];
  formularioId: string | null;
  metodosPago: EventoMetodoPagoSnapshot[];
};

/** What `draftFromEventoDuplicado` had to clear because it was already in the past (US-0122). */
export type EventoDuplicadoAjustes = {
  fechaLimpiada: boolean;
};

/**
 * Validation errors keyed by field path: `nombre`, `entradas`, `entrada.{clientKey}.valor`,
 * `cupon.{clientKey}.cupon`, `metodosPago`, … Values are Spanish messages.
 */
export type EventoWizardErrors = Record<string, string>;

// ─── Management page ───

/** View model used by the management page. */
export type EventoListItem = {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion: string | null;
  disciplinaNombre: string | null;
  escenarioNombre: string | null;
  /** Trainer snapshot names joined with ", ", or null. */
  entrenadorNombre: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  puntoEncuentro: string | null;
  estado: EventoEstado;
  precio: PrecioItem[];
  bannerUrl: string | null;
  activo: boolean;
  publico: boolean;
  borrador: boolean;
  /** Form template the event asks for; used to keep Múltiple bundles on a single form (US-0121). */
  formularioId: string | null;
};

/** Server-side filters. `desde` inclusive, `hasta` exclusive (ISO timestamps). */
export type EventosListFilters = {
  desde?: string;
  hasta?: string;
};

export type EventosVista = 'tarjetas' | 'lista' | 'calendario';

export const EVENTOS_VISTAS: readonly EventosVista[] = ['tarjetas', 'lista', 'calendario'] as const;

export type EventosPeriodo = 'proximos' | 'pasados' | 'todos';

export type EventosEstadoFiltro = EventoEstado | 'borrador' | 'todos';

export type EventosClientFilters = {
  search: string;
  /** `borrador` shows only drafts; `confirmado` / `cancelado` exclude drafts. */
  estado: EventosEstadoFiltro;
  periodo: EventosPeriodo;
  /** Discipline NAME, or 'todas'. */
  disciplina: string | 'todas';
};

export const DEFAULT_EVENTOS_FILTERS: EventosClientFilters = {
  search: '',
  estado: 'todos',
  periodo: 'proximos',
  disciplina: 'todas',
};

export type EventosStats = {
  total: number;
  proximosConfirmados: number;
  cancelados: number;
  borradores: number;
};

// ─── Public discovery (US-0120) ───

/** Cross-tenant listing item for /eventos and /portal/eventos. Built only from `eventos` columns. */
export type EventoPublicoListItem = {
  id: string;
  tenantId: string;
  nombreTenant: string;
  nombre: string;
  descripcion: string | null;
  paginaEventoUrl: string | null;
  disciplinaNombre: string;
  escenario: EventoEscenarioSnapshot | null;
  escenarioNombre: string | null;
  escenarioUbicacion: string | null;
  puntoEncuentro: string | null;
  entrenadores: EventoEntrenadorSnapshot[];
  /** Trainer names joined with ", ", or null. */
  entrenadorNombre: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  reservaAntelacionHoras: number | null;
  /** Null: tickets cannot be cancelled and there is no refund (US-0121). */
  cancelacionAntelacionHoras: number | null;
  precio: PrecioItem[];
  /** Payment methods the admin published for this event (US-0119 step 3). */
  metodosPago: EventoMetodoPagoSnapshot[];
  bannerUrl: string | null;
  publico: boolean;
};

/** Detail page and wizard preview model. */
export type EventoPublicoDetalle = EventoPublicoListItem & {
  descripcionLarga: string | null;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
};

export type EventoEntradasModo = 'usuario' | 'invitado';

export type EventosPublicosDateChip = 'today' | 'tomorrow' | 'this_week' | 'weekend';

export type EventoServiceErrorCode =
  | 'forbidden'
  | 'not_found'
  | 'duplicate_entrada'
  | 'duplicate_cupon'
  | 'invalid_reference'
  | 'invalid_data'
  /** Hard delete blocked by sold tickets (`on delete restrict`, US-0121). */
  | 'has_purchases'
  | 'unknown';

export class EventoServiceError extends Error {
  code: EventoServiceErrorCode;

  constructor(code: EventoServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'EventoServiceError';
  }
}
