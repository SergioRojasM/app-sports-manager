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
  comprobante_url: string | null;
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
  plan_vigencia_meses: number;
  plan_clases_incluidas: number | null;
  atleta_id: string;
  atleta_nombre: string;
  atleta_email: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
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
  clases_restantes: number | null;
}

/** Service-level error with typed code. */
export class GestionSuscripcionesServiceError extends Error {
  readonly code: 'forbidden' | 'unknown';

  constructor(code: 'forbidden' | 'unknown', message: string) {
    super(message);
    this.code = code;
    this.name = 'GestionSuscripcionesServiceError';
  }
}
