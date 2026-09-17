import type { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/services/supabase/server';
import { logAuditEvent } from '@/lib/portal/audit-log';
import { mapInvitacionesDbError } from '@/lib/portal/invitaciones-errors';
import { generateTemporaryPassword } from '@/lib/portal/password-generator';
import {
  errorResponse,
  isEmailAlreadyRegistered,
  isUuid,
  jsonNoStore,
  optionalTrimmedString,
  readJsonObject,
} from '@/lib/portal/privileged-route';
import type { AltaAdministradaResultado } from '@/types/portal/invitaciones.types';

type RouteContext = { params: Promise<{ tenant_id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { tenant_id: tenantId } = await context.params;
  if (!isUuid(tenantId)) return errorResponse('not_found', 404);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse('unauthenticated', 401);

  const body = await readJsonObject(request);
  // The administrator can never choose the password.
  if (!body || 'password' in body || 'contrasena' in body || 'contrasena_temporal' in body) {
    return errorResponse('invalid_request', 422);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const rolId = body.rol_id;
  const nombre = optionalTrimmedString(body.nombre, 100);
  const nota = optionalTrimmedString(body.nota, 500);
  if (!email || !isUuid(rolId) || nombre === null || nota === null) {
    return errorResponse('invalid_request', 422);
  }

  const { data: altaId, error: reserveError } = await supabase.rpc('reservar_alta_administrada', {
    p_tenant_id: tenantId,
    p_email: email,
    p_rol_id: rolId,
    p_nota: nota ?? null,
  });

  if (reserveError || typeof altaId !== 'string') {
    const mapped = mapInvitacionesDbError(reserveError);
    return errorResponse(mapped.code, mapped.status);
  }

  const audit = { tenant_id: tenantId, actor_id: user.id, objetivo_id: altaId };

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    logAuditEvent({ ...audit, evento: 'alta_administrada_fallida', resultado: 'error', codigo: 'server_misconfigured' });
    return errorResponse('unexpected', 500);
  }

  const contrasenaTemporal = generateTemporaryPassword();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password: contrasenaTemporal,
    email_confirm: true,
    user_metadata: nombre ? { nombre } : undefined,
  });

  if (createError || !created?.user) {
    const accountExists = isEmailAlreadyRegistered(createError);
    const codigo = accountExists ? 'cuenta_existente' : 'auth_create_error';
    await service.rpc('registrar_fallo_alta', { p_alta_id: altaId, p_codigo: codigo });
    logAuditEvent({ ...audit, evento: 'alta_administrada_fallida', resultado: accountExists ? 'rechazado' : 'error', codigo });
    return accountExists ? errorResponse('account_exists', 409) : errorResponse('unexpected', 500);
  }

  const nuevoUsuarioId = created.user.id;

  const { data: miembroId, error: completeError } = await service.rpc('completar_alta_administrada', {
    p_alta_id: altaId,
    p_usuario_id: nuevoUsuarioId,
  });

  if (completeError || typeof miembroId !== 'string') {
    const { error: deleteError } = await service.auth.admin.deleteUser(nuevoUsuarioId);
    const codigo = deleteError ? 'compensacion_fallida' : 'compensado';
    await service.rpc('registrar_fallo_alta', { p_alta_id: altaId, p_codigo: codigo });
    logAuditEvent({
      ...audit,
      evento: deleteError ? 'alta_administrada_compensacion_fallida' : 'alta_administrada_compensada',
      resultado: 'error',
      codigo,
    });
    return errorResponse('unexpected', 500);
  }

  logAuditEvent({ ...audit, evento: 'alta_administrada_creada', resultado: 'ok' });

  return jsonNoStore<AltaAdministradaResultado>(
    { miembro_id: miembroId, contrasena_temporal: contrasenaTemporal },
    201,
  );
}
