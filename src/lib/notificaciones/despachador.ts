import 'server-only';
import { createServiceClient } from '@/services/supabase/server';
import { logAuditEvent } from '@/lib/portal/audit-log';
import { EnvioEmailError, enviarEmail } from '@/lib/notificaciones/resend';
import { resolverHandler } from '@/lib/notificaciones/registro';
import type { DespachoResultado, NotificacionOutboxRow } from '@/types/portal/notificaciones.types';

const EMAIL_RE = /[^\s@]+@[^\s@]+/g;

/** Short code stored in `ultimo_error` and logged. Addresses are stripped defensively. */
function codigoError(error: unknown): string {
  if (error instanceof EnvioEmailError) return error.code;
  const message = error instanceof Error ? error.message : 'unknown_error';
  return message.replace(EMAIL_RE, '[email]').slice(0, 200) || 'unknown_error';
}

async function enviarFila(row: NotificacionOutboxRow): Promise<string> {
  const handler = resolverHandler(row.modulo, row.tipo);
  if (!handler) throw new EnvioEmailError('handler_not_found');

  const email = await handler(row);
  if (!email) throw new EnvioEmailError('skipped');

  const { id } = await enviarEmail({
    para: row.destinatario_email,
    asunto: email.asunto,
    html: email.html,
    texto: email.texto,
    adjuntos: email.adjuntos,
    idempotencyKey: row.id,
  });
  return id;
}

/**
 * Claims due outbox rows and sends them one by one (serial: stays under the provider's rate limit).
 * Every row is resolved on its own, so a failing one never blocks the rest of the batch.
 */
export async function despacharNotificaciones(limite = 20): Promise<DespachoResultado> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('reclamar_notificaciones_outbox', { p_limite: limite });
  if (error) throw new Error(`reclamar_failed:${error.code ?? 'unknown'}`);

  const filas = (data ?? []) as NotificacionOutboxRow[];
  const resultado: DespachoResultado = { procesadas: filas.length, enviadas: 0, fallidas: 0 };

  for (const row of filas) {
    let proveedorId: string | null = null;
    let codigo: string | null = null;
    try {
      proveedorId = await enviarFila(row);
    } catch (sendError) {
      codigo = codigoError(sendError);
    }

    const ok = codigo === null;
    const { error: resolveError } = await supabase.rpc('resolver_notificacion_outbox', {
      p_id: row.id,
      p_ok: ok,
      p_proveedor_id: proveedorId,
      p_error: codigo,
    });
    // An unresolved row stays in `procesando` and is reclaimed after 10 minutes
    if (resolveError) console.error(`[notificaciones] resolve failed (${row.id}): ${resolveError.code ?? 'unknown'}`);

    if (ok) resultado.enviadas += 1;
    else resultado.fallidas += 1;

    logAuditEvent({
      evento: ok ? 'notificacion_enviada' : 'notificacion_fallida',
      tenant_id: row.tenant_id,
      actor_id: null,
      objetivo_id: row.id,
      resultado: ok ? 'ok' : 'error',
      codigo: ok ? `${row.modulo}.${row.tipo}` : codigo,
    });
  }

  return resultado;
}
