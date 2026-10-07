import 'server-only';
import { createServiceClient } from '@/services/supabase/server';
import { logAuditEvent, type AuditEvento } from '@/lib/portal/audit-log';
import { errorResponse, jsonNoStore } from '@/lib/portal/privileged-route';
import type { InvitacionEnviadaResultado } from '@/types/portal/invitaciones.types';

type DeliverInvitationInput = {
  invitacionId: string;
  tenantId: string;
  actorId: string;
  evento: Extract<AuditEvento, 'invitacion_creada' | 'invitacion_reenviada'>;
};

/**
 * Hands the invitation to the notifications module (US-0137): `encolar_invitacion_tenant` queues
 * the email — and an in-app notification for an established account — and the dispatcher sends it,
 * generating the sign-in link at that moment. Nothing here depends on whether the email already
 * has an account, so the 202 body never reveals it.
 */
export async function deliverInvitation(input: DeliverInvitationInput) {
  const { invitacionId, tenantId, actorId, evento } = input;

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    logAuditEvent({ evento: 'invitacion_fallida', tenant_id: tenantId, actor_id: actorId, objetivo_id: invitacionId, resultado: 'error', codigo: 'server_misconfigured' });
    return errorResponse('unexpected', 500);
  }

  const { error: enqueueError } = await service.rpc('encolar_invitacion_tenant', {
    p_invitacion_id: invitacionId,
  });

  if (enqueueError) {
    await service.rpc('registrar_fallo_invitacion', {
      p_invitacion_id: invitacionId,
      p_codigo: 'enqueue_error',
    });
    logAuditEvent({ evento: 'invitacion_fallida', tenant_id: tenantId, actor_id: actorId, objetivo_id: invitacionId, resultado: 'error', codigo: 'enqueue_error' });
    return errorResponse('unexpected', 500);
  }

  logAuditEvent({
    evento,
    tenant_id: tenantId,
    actor_id: actorId,
    objetivo_id: invitacionId,
    resultado: 'ok',
    codigo: 'encolada',
  });

  return jsonNoStore<InvitacionEnviadaResultado>({ invitacion_id: invitacionId }, 202);
}
