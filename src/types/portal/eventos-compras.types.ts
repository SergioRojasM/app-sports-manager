import type { EventoEntradaTipo, EventoMetodoPagoSnapshot } from '@/types/portal/eventos.types';
import type { FormularioPerfilCampo, FormularioSeccion } from '@/types/portal/formularios.types';

// ─── States (US-0121) ───

export type EventoCompraEstado =
  | 'pendiente_pago'
  | 'en_validacion'
  | 'confirmada'
  | 'rechazada'
  | 'cancelada'
  | 'expirada';

export const EVENTO_COMPRA_ESTADOS: readonly EventoCompraEstado[] = [
  'pendiente_pago',
  'en_validacion',
  'confirmada',
  'rechazada',
  'cancelada',
  'expirada',
] as const;

export const EVENTO_COMPRA_ESTADO_LABELS: Record<EventoCompraEstado, string> = {
  pendiente_pago: 'Pendiente de pago',
  en_validacion: 'En validación',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

export type EventoTicketEstado = 'pendiente' | 'activa' | 'anulada';

// ─── Checkout ───

/** A ticket type as read by the checkout (`evento_entradas` with non-null name and value). */
export type EntradaVendible = {
  id: string;
  tipoEntrada: EventoEntradaTipo;
  nombre: string;
  valor: number;
  validaDesde: string | null;
  validaHasta: string | null;
  eventosIdBundle: string[];
  orden: number;
};

export type CuponValidacion = {
  valido: boolean;
  descuentoPct: number | null;
  total: number | null;
  motivo: string | null;
};

/**
 * The event's current form snapshot (`evento_formularios`, vigente row). `campos` are the template's
 * esquema rows as copied when the event was saved, shaped as `FormularioSeccion` for the shared renderers.
 */
export type EventoFormularioSnapshot = {
  id: string;
  nombre: string;
  perfilCamposRequeridos: FormularioPerfilCampo[];
  campos: FormularioSeccion[];
};

/** A purchase's answers (`evento_formulario_respuestas`) with the snapshot version they answered. */
export type EventoFormularioRespuesta = {
  id: string;
  datosPerfil: Record<string, string>;
  respuestas: Record<string, string>;
  /** `{ campo_nombre: storage path }` for imagen fields. */
  archivos: Record<string, string>;
  formulario: Omit<EventoFormularioSnapshot, 'id'> | null;
};

/** Fixed buyer fields typed in step 2. `emailConfirmacion` is client-only (guests type the email twice). */
export type CompradorInput = {
  nombre: string;
  email: string;
  emailConfirmacion: string;
  /** `YYYY-MM-DD`. */
  fechaNacimiento: string;
};

export type IniciarCompraInput = {
  eventoId: string;
  entradaId: string;
  cupon: string | null;
  metodoPagoId: string | null;
  comprador: Pick<CompradorInput, 'nombre' | 'email' | 'fechaNacimiento'>;
  /** Requested profile fields (non-fixed keys only). */
  datosPerfil: Record<string, string>;
  /** Non-image form answers keyed by `campo_nombre`. */
  respuestas: Record<string, string>;
};

export type TicketResultado = {
  id: string;
  eventoId: string;
  eventoNombre: string;
  fechaHora: string | null;
  lugar: string | null;
  nombreTenant: string;
  codigo: string;
  estado: EventoTicketEstado;
};

/** Shape returned by every purchase RPC — enough for step 4 and the PDF without another read. */
export type CompraResultado = {
  compraId: string;
  tenantId: string;
  estado: EventoCompraEstado;
  requiereArchivos: boolean;
  tickets: TicketResultado[];
  cancelacionAntelacionHoras: number | null;
  total: number;
  entradaNombre: string;
  compradorNombre: string;
  compradorEmail: string;
  createdAt: string;
};

// ─── Mis Entradas ───

export type MiCompraTicket = {
  id: string;
  eventoId: string;
  codigo: string;
  estado: EventoTicketEstado;
  asistenteNombre: string;
  asistenteEmail: string;
  /** Null when the buyer can no longer read that event (e.g. it was deactivated). */
  eventoNombre: string | null;
  fechaHora: string | null;
  lugar: string | null;
  nombreTenant: string | null;
};

export type MiCompraEvento = {
  id: string;
  nombre: string;
  nombreTenant: string;
  fechaHora: string | null;
  duracionMinutos: number | null;
  lugar: string | null;
  bannerUrl: string | null;
  cancelacionAntelacionHoras: number | null;
};

export type MiCompra = {
  id: string;
  tenantId: string;
  eventoId: string;
  estado: EventoCompraEstado;
  entradaNombre: string;
  entradaTipo: EventoEntradaTipo;
  total: number;
  cuponCodigo: string | null;
  descuentoPct: number | null;
  metodoPago: EventoMetodoPagoSnapshot | null;
  motivoRechazo: string | null;
  compradorNombre: string;
  compradorEmail: string;
  createdAt: string;
  /** Null when the buyer can no longer read the event. */
  evento: MiCompraEvento | null;
  tickets: MiCompraTicket[];
};

export type MisEntradasTab = 'proximas' | 'pasadas';

// ─── Admin "Compras" ───

export type CompraAdminItem = {
  id: string;
  estado: EventoCompraEstado;
  compradorNombre: string;
  compradorEmail: string;
  compradorFechaNacimiento: string;
  /** False for guest purchases (not linked to an account). */
  registrado: boolean;
  entradaNombre: string;
  entradaTipo: EventoEntradaTipo;
  valorBase: number;
  total: number;
  cuponCodigo: string | null;
  descuentoPct: number | null;
  metodoPago: EventoMetodoPagoSnapshot | null;
  comprobantePath: string | null;
  motivoRechazo: string | null;
  createdAt: string;
  validadoAt: string | null;
  tickets: { eventoId: string; codigo: string; estado: EventoTicketEstado }[];
  respuesta: EventoFormularioRespuesta | null;
};

export type EventoComprasEstadoFiltro = EventoCompraEstado | 'todos';

export type EventoComprasStats = {
  enValidacion: number;
  confirmadas: number;
  ingresosConfirmados: number;
};

// ─── Ticket PDF ───

/** One PDF page. Built from a `CompraResultado` (step 4) or a `MiCompra` (Mis Entradas). */
export type TicketPdfData = {
  codigo: string;
  estado: EventoTicketEstado;
  eventoNombre: string;
  nombreTenant: string;
  fechaHora: string | null;
  lugar: string | null;
  entradaNombre: string;
  asistenteNombre: string;
  asistenteEmail: string;
  /** ISO timestamp of the purchase. */
  fechaCompra: string;
  total: number;
  cancelacionAntelacionHoras: number | null;
};

// ─── Service error ───

export type EventoCompraServiceErrorCode =
  | 'no_disponible'
  | 'venta_cerrada'
  | 'invalid_data'
  | 'cupon_invalido'
  | 'duplicada'
  | 'agotado'
  | 'expirada'
  | 'no_cancelable'
  | 'invalid_state'
  | 'forbidden'
  | 'unknown';

export class EventoCompraServiceError extends Error {
  code: EventoCompraServiceErrorCode;

  constructor(code: EventoCompraServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'EventoCompraServiceError';
  }
}
