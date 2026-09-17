/* ───────────────────────────────────────────────
 * invitaciones.types.ts
 * Domain types for administrator onboarding of tenant members (US-0114):
 * email invitations and administrator-provisioned accounts.
 * ─────────────────────────────────────────────── */

/** Invitation lifecycle state (mirrors invitaciones_tenant_estado_ck). */
export type InvitacionEstado = 'pendiente' | 'enviada' | 'aceptada' | 'cancelada' | 'expirada' | 'fallida';

/** Row shape of v_invitaciones_tenant_admin. Never includes the delivery channel. */
export type InvitacionRow = {
  id: string;
  tenant_id: string;
  email: string;
  rol_id: string;
  rol_nombre: string;
  nombre: string | null;
  nota_admin: string | null;
  estado: InvitacionEstado;
  creada_por: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Filter options for the admin Invitaciones tab. */
export type InvitacionesFiltro = 'activas' | 'todas' | InvitacionEstado;

/** An invitation addressed to the authenticated user's verified email. */
export type MiInvitacionPendiente = {
  id: string;
  tenant_id: string;
  tenant_nombre: string;
  rol_nombre: string;
  expires_at: string;
};

/** Invitation details shown on the acceptance page. */
export type InvitacionParaAceptar = MiInvitacionPendiente & {
  estado: InvitacionEstado;
};

/** Result of accepting an invitation. */
export type AceptarInvitacionResultado = {
  tenant_id: string;
  miembro_id: string;
};

/** Onboarding mode selected in AgregarMiembroModal. */
export type AgregarMiembroModo = 'invitacion' | 'contrasena_temporal';

/** Payload submitted by AgregarMiembroModal. */
export type AgregarMiembroInput = {
  email: string;
  rol_id: string;
  nombre?: string;
  nota?: string;
};

/** Response of the invitation create/resend routes. */
export type InvitacionEnviadaResultado = {
  invitacion_id: string;
};

/**
 * Response of the provisioning route. `contrasena_temporal` is shown exactly once
 * and must never be persisted, logged, or kept in state after the reveal modal closes.
 */
export type AltaAdministradaResultado = {
  miembro_id: string;
  contrasena_temporal: string;
};

/** Error codes shared by the privileged routes and the invitaciones service. */
export type InvitacionesErrorCode =
  | 'forbidden'
  | 'unauthenticated'
  | 'invalid_request'
  | 'rate_limited'
  | 'not_found'
  | 'expired'
  | 'cancelled'
  | 'already_accepted'
  | 'email_mismatch'
  | 'feature_disabled'
  | 'account_exists'
  | 'unexpected';

/** Error body returned by the privileged routes. */
export type InvitacionesErrorBody = {
  code: InvitacionesErrorCode;
};

/** Service-level error with a typed code. */
export class InvitacionesServiceError extends Error {
  readonly code: InvitacionesErrorCode;

  constructor(code: InvitacionesErrorCode, message: string) {
    super(message);
    this.name = 'InvitacionesServiceError';
    this.code = code;
  }
}
