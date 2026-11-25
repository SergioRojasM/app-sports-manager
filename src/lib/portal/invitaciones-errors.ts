import type { InvitacionesErrorCode } from '@/types/portal/invitaciones.types';

type DbErrorLike = { code?: string | null; message?: string | null } | null | undefined;

export type MappedInvitacionesError = {
  status: number;
  code: InvitacionesErrorCode;
};

const P0001_MESSAGES: Record<string, MappedInvitacionesError> = {
  RATE_LIMIT: { status: 429, code: 'rate_limited' },
  FEATURE_DISABLED: { status: 403, code: 'feature_disabled' },
  EXPIRED: { status: 410, code: 'expired' },
  CANCELLED: { status: 410, code: 'cancelled' },
  EMAIL_MISMATCH: { status: 403, code: 'email_mismatch' },
  ALREADY_ACCEPTED: { status: 409, code: 'already_accepted' },
  ACCOUNT_EXISTS: { status: 409, code: 'account_exists' },
};

/** Maps the SQLSTATE/message contract of the onboarding RPCs to an HTTP status and error code. */
export function mapInvitacionesDbError(error: DbErrorLike): MappedInvitacionesError {
  switch (error?.code) {
    case '42501':
      return { status: 403, code: 'forbidden' };
    case '22023':
      return { status: 422, code: 'invalid_request' };
    case 'P0002':
      return { status: 404, code: 'not_found' };
    case 'P0001':
      return P0001_MESSAGES[error?.message ?? ''] ?? { status: 500, code: 'unexpected' };
    default:
      return { status: 500, code: 'unexpected' };
  }
}

export const INVITACIONES_ERROR_MESSAGES: Record<InvitacionesErrorCode, string> = {
  forbidden: 'No tienes permisos para realizar esta acción.',
  unauthenticated: 'Tu sesión expiró. Inicia sesión nuevamente.',
  invalid_request: 'Revisa los datos ingresados e intenta de nuevo.',
  rate_limited: 'Has alcanzado el límite de envíos. Intenta de nuevo más tarde.',
  not_found: 'No encontramos la invitación solicitada.',
  expired: 'La invitación expiró. Pide a la organización que la reenvíe.',
  cancelled: 'La invitación fue cancelada por la organización.',
  already_accepted: 'Esta invitación ya fue aceptada.',
  email_mismatch: 'Esta invitación fue enviada a otro correo electrónico.',
  feature_disabled: 'La creación de cuentas con contraseña temporal no está habilitada para esta organización.',
  account_exists: 'No es posible crear una cuenta con este correo. Usa la invitación por email.',
  unexpected: 'Ocurrió un error inesperado. Intenta de nuevo.',
};
