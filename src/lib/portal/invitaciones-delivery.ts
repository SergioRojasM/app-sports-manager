import 'server-only';
import { createServiceClient } from '@/services/supabase/server';
import { logAuditEvent, type AuditEvento } from '@/lib/portal/audit-log';
import {
  buildInvitacionRedirectTo,
  errorResponse,
  isEmailAlreadyRegistered,
  jsonNoStore,
} from '@/lib/portal/privileged-route';
import type { InvitacionEnviadaResultado } from '@/types/portal/invitaciones.types';

type DeliverInvitationInput = {
  invitacionId: string;
  tenantId: string;
  actorId: string;
  email: string;
  nombre?: string | null;
  evento: Extract<AuditEvento, 'invitacion_creada' | 'invitacion_reenviada'>;
};

/**
 * Sends the Supabase Auth invite and records the outcome. A registered email cannot receive
 * an Auth invite, so the invitation is delivered in-app instead; both branches return the
 * same 202 body so the response never reveals whether the email already has an account.
 */
export async function deliverInvitation(input: DeliverInvitationInput) {
  const { invitacionId, tenantId, actorId, email, nombre, evento } = input;

  let service: ReturnType<typeof createServiceClient>;
  let redirectTo: string;
  try {
    service = createServiceClient();
    redirectTo = buildInvitacionRedirectTo(invitacionId);
  } catch {
    logAuditEvent({ evento: 'invitacion_fallida', tenant_id: tenantId, actor_id: actorId, objetivo_id: invitacionId, resultado: 'error', codigo: 'server_misconfigured' });
    return errorResponse('unexpected', 500);
  }

  const { error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: nombre ? { nombre } : undefined,
  });

  if (inviteError && !isEmailAlreadyRegistered(inviteError)) {
    await service.rpc('registrar_fallo_invitacion', {
      p_invitacion_id: invitacionId,
      p_codigo: 'auth_invite_error',
    });
    logAuditEvent({ evento: 'invitacion_fallida', tenant_id: tenantId, actor_id: actorId, objetivo_id: invitacionId, resultado: 'error', codigo: 'auth_invite_error' });
    return errorResponse('unexpected', 500);
  }

  const canal = inviteError ? 'in_app' : 'email';
  const { error: recordError } = await service.rpc('registrar_envio_invitacion', {
    p_invitacion_id: invitacionId,
    p_canal: canal,
  });

  logAuditEvent({
    evento,
    tenant_id: tenantId,
    actor_id: actorId,
    objetivo_id: invitacionId,
    resultado: recordError ? 'error' : 'ok',
    codigo: recordError ? 'registro_envio_fallido' : canal,
  });

  return jsonNoStore<InvitacionEnviadaResultado>({ invitacion_id: invitacionId }, 202);
}
