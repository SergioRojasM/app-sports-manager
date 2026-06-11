/* ───────────────────────────────────────────────
 * gestion-suscripciones.types.ts
 * Domain types for the admin subscription management feature slice.
 * ─────────────────────────────────────────────── */

/** Allowed values for suscripciones.estado. */
export type SuscripcionEstado = 'pendiente' | 'activa' | 'vencida' | 'cancelada';

/** Allowed values for pagos.estado. */
export type PagoEstado = 'pendiente' | 'validado' | 'rechazado';

/** Allowed values for pagos.metodo_pago. */
export type MetodoPago = 'transferencia' | 'efectivo' | 'tarjeta';

/** Payment row surfaced in the admin subscription table. */
export interface PagoAdminRow {
  id: string;
  monto: number;
  metodo_pago: MetodoPago | null;
  metodo_pago_nombre: string | null;
  metodo_pago_tipo: string | null;
  comprobante_path: string | null;
  estado: PagoEstado;
  validado_por: string | null;
  validado_por_nombre: string | null;
  fecha_pago: string | null;
  fecha_validacion: string | null;
  created_at: string;
}

/** Subscription row surfaced in the admin subscription table. */
export interface SuscripcionAdminRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  plan_nombre: string;
  plan_tipo_id: string | null;
  plan_tipo_nombre: string | null;
  plan_tipo_vigencia_dias: number | null;
  atleta_id: string;
  atleta_nombre: string;
  atleta_email: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: SuscripcionEstado;
  comentarios: string | null;
  validado_por: string | null;
  validado_por_nombre: string | null;
  created_at: string;
  pago: PagoAdminRow | null;
}

/** Aggregate statistics derived in-memory from the subscription list. */
export interface SuscripcionesAdminStats {
  activas: number;
  pendientes: number;
  pagoPendiente: number;
}

/** Form values for the approval modal — all are editable by the admin. */
export interface ValidarSuscripcionFormValues {
  fecha_inicio: string;
  fecha_fin: string;
}

/** Form values for the full-field edit modal. */
export interface EditarSuscripcionFormValues {
  plan_id: string;
  estado: SuscripcionEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  comentarios: string | null;
}

/** Payload for admin-initiated subscription creation. */
export interface CrearSuscripcionAdminPayload {
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  plan_tipo_id: string | null;
  estado: 'pendiente' | 'activa';
  fecha_inicio: string | null;
  fecha_fin: string | null;
  comentarios: string | null;
  validado_por: string | null;
  pago: {
    monto: number;
    metodo_pago_id: string;
    estado: 'pendiente' | 'validado';
  } | null;
}

/** Form state for the 3-step admin subscription creation modal. */
export interface CrearSuscripcionAdminFormValues {
  atleta_id: string;
  plan_id: string;
  plan_tipo_id: string | null;
  estado: 'pendiente' | 'activa';
  fecha_inicio: string;
  fecha_fin: string;
  comentarios: string;
  crearPago: boolean;
  monto: string;
  metodo_pago_id: string;
  estado_pago: 'pendiente' | 'validado';
}

/** Service-level error with typed code. */
export class GestionSuscripcionesServiceError extends Error {
  readonly code: 'forbidden' | 'unknown' | 'pago_failed' | 'populate_servicios_failed';

  constructor(code: 'forbidden' | 'unknown' | 'pago_failed' | 'populate_servicios_failed', message: string) {
    super(message);
    this.code = code;
    this.name = 'GestionSuscripcionesServiceError';
  }
}
