/* ───────────────────────────────────────────────
 * solicitudes.types.ts
 * Domain types for the Organization Access Request feature slice.
 * ─────────────────────────────────────────────── */

/** Allowed values for the solicitud estado column. */
export type SolicitudEstado = 'pendiente' | 'aceptada' | 'rechazada';

/** Row returned by the solicitudes service join query (includes user info). */
export type SolicitudRow = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  estado: SolicitudEstado;
  mensaje: string | null;
  nota_revision: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
  created_at: string;
  nombre: string;
  apellido: string;
  email: string;
  foto_url: string | null;
};

/** Input for creating a new access request. */
export type CreateSolicitudInput = {
  tenant_id: string;
  usuario_id: string;
  mensaje?: string;
};

/** Input for accepting a request (admin). */
export type AceptarSolicitudInput = {
  solicitud_id: string;
  tenant_id: string;
  usuario_id: string;
  rol_id: string;
  revisado_por: string;
};

/** Input for rejecting a request (admin). */
export type RechazarSolicitudInput = {
  solicitud_id: string;
  revisado_por: string;
  nota_revision?: string;
};

/** Service-level error with a typed code. */
export class SolicitudesServiceError extends Error {
  readonly code: 'forbidden' | 'duplicate' | 'max_rejections' | 'already_member' | 'unknown';

  constructor(
    code: 'forbidden' | 'duplicate' | 'max_rejections' | 'already_member' | 'unknown',
    message: string,
  ) {
    super(message);
    this.name = 'SolicitudesServiceError';
    this.code = code;
  }
}
