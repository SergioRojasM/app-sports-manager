export type SuscripcionEstado = 'pendiente' | 'activa' | 'vencida' | 'cancelada';

export type Suscripcion = {
  id: string;
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  plan_tipo_id: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  comentarios: string | null;
  estado: SuscripcionEstado;
  created_at: string;
};

/** Input of the `comprar_suscripcion` RPC (US-0134). The athlete and the amount are set by the server. */
export type ComprarSuscripcionPayload = {
  tenantId: string;
  planId: string;
  planTipoId: string | null;
  metodoPagoId: string | null;
  comentarios: string | null;
  /** Generated in the browser so the proof can be uploaded to its path before the purchase. */
  pagoId: string;
  /** Storage path of the already-uploaded proof, or `null`. */
  comprobantePath: string | null;
};

export type ComprarSuscripcionResultado = {
  suscripcionId: string;
  pagoId: string;
};

export type SuscripcionServicio = {
  id: string;
  suscripcion_id: string;
  servicio_id: string;
  unidades_incluidas: number | null;
  unidades_restantes: number | null;
  created_at: string;
};

export type SuscripcionServiceErrorCode =
  /** The plan or its subtype is inactive, hidden, private, or no longer public (US-0093). */
  | 'plan_unavailable'
  /** The athlete already has a pending request for this plan (US-0134). */
  | 'pending_exists'
  | 'invalid_payment_method'
  | 'invalid_proof'
  | 'unknown';

export class SuscripcionServiceError extends Error {
  code: SuscripcionServiceErrorCode;

  constructor(code: SuscripcionServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'SuscripcionServiceError';
  }
}

export interface SuscripcionServicioDisplay {
  servicio_id: string;
  servicio_nombre: string;
  unidades_incluidas: number | null;
  unidades_restantes: number | null;
}
