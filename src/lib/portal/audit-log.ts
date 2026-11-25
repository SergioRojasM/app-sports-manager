import 'server-only';

export type AuditEvento =
  | 'invitacion_creada'
  | 'invitacion_reenviada'
  | 'invitacion_fallida'
  | 'alta_administrada_creada'
  | 'alta_administrada_fallida'
  | 'alta_administrada_compensada'
  | 'alta_administrada_compensacion_fallida'
  | 'notificacion_enviada'
  | 'notificacion_fallida';

export type AuditResultado = 'ok' | 'rechazado' | 'error';

/**
 * Only these fields can ever be logged. Passwords, tokens, email addresses and raw
 * error objects are intentionally not representable here.
 */
export type AuditEvent = {
  evento: AuditEvento;
  /** Null for notifications that belong to no tenant (US-0125). */
  tenant_id: string | null;
  /** Null for system jobs such as the notifications dispatcher (US-0125). */
  actor_id: string | null;
  objetivo_id?: string | null;
  resultado: AuditResultado;
  codigo?: string | null;
};

export function logAuditEvent(event: AuditEvent): void {
  const line = JSON.stringify({
    tipo: 'audit',
    at: new Date().toISOString(),
    evento: event.evento,
    tenant_id: event.tenant_id,
    actor_id: event.actor_id,
    objetivo_id: event.objetivo_id ?? null,
    resultado: event.resultado,
    codigo: event.codigo ?? null,
  });

  if (event.resultado === 'error') {
    console.error(line);
  } else {
    console.info(line);
  }
}
