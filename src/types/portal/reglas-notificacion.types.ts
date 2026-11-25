// Tenant notification rules (US-0135): when, to whom and through which channels the automatic
// subscription expiry alerts are sent.

export type ReglaNotificacionTipo = 'vencimiento_pre' | 'vencimiento_pos';

export type ReglaNotificacionDestinatarios = 'atletas' | 'administradores' | 'todos';

export const REGLA_NOTIFICACION_TIPOS: ReglaNotificacionTipo[] = ['vencimiento_pre', 'vencimiento_pos'];

export const REGLA_NOTIFICACION_TIPO_LABELS: Record<ReglaNotificacionTipo, string> = {
  vencimiento_pre: 'Antes del vencimiento',
  vencimiento_pos: 'Después del vencimiento',
};

export const REGLA_NOTIFICACION_DESTINATARIOS: ReglaNotificacionDestinatarios[] = [
  'atletas',
  'administradores',
  'todos',
];

export const REGLA_NOTIFICACION_DESTINATARIOS_LABELS: Record<ReglaNotificacionDestinatarios, string> = {
  atletas: 'Solo atletas',
  administradores: 'Solo administradores',
  todos: 'Administradores y atletas',
};

/** Also enforced by the database (trigger and check constraint). */
export const REGLA_NOTIFICACION_MAX_POR_TIPO = 3;
export const REGLA_NOTIFICACION_DIAS_MAX = 60;

export type ReglaNotificacion = {
  id: string;
  tenant_id: string;
  tipo: ReglaNotificacionTipo;
  dias: number;
  destinatarios: ReglaNotificacionDestinatarios;
  canal_in_app: boolean;
  canal_email: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ReglaNotificacionCreatePayload = {
  tenant_id: string;
  tipo: ReglaNotificacionTipo;
  dias: number;
  destinatarios: ReglaNotificacionDestinatarios;
  canal_in_app: boolean;
  canal_email: boolean;
  activo: boolean;
};

/** `tipo` and `tenant_id` are immutable. */
export type ReglaNotificacionUpdatePayload = Omit<ReglaNotificacionCreatePayload, 'tenant_id' | 'tipo'>;

export type ReglaNotificacionServiceErrorCode = 'duplicate' | 'max_reached' | 'forbidden' | 'unknown';

export class ReglaNotificacionServiceError extends Error {
  code: ReglaNotificacionServiceErrorCode;

  constructor(code: ReglaNotificacionServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ReglaNotificacionServiceError';
  }
}
