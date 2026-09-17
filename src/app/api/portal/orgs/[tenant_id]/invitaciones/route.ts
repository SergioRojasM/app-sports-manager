import type { NextRequest } from 'next/server';
import { createClient } from '@/services/supabase/server';
import { deliverInvitation } from '@/lib/portal/invitaciones-delivery';
import { mapInvitacionesDbError } from '@/lib/portal/invitaciones-errors';
import { errorResponse, isUuid, optionalTrimmedString, readJsonObject } from '@/lib/portal/privileged-route';

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
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const rolId = body?.rol_id;
  const nombre = optionalTrimmedString(body?.nombre, 100);
  const nota = optionalTrimmedString(body?.nota, 500);
  if (!body || !email || !isUuid(rolId) || nombre === null || nota === null) {
    return errorResponse('invalid_request', 422);
  }

  const { data: invitacionId, error } = await supabase.rpc('crear_invitacion_tenant', {
    p_tenant_id: tenantId,
    p_email: email,
    p_rol_id: rolId,
    p_nombre: nombre ?? null,
    p_nota: nota ?? null,
  });

  if (error || typeof invitacionId !== 'string') {
    const mapped = mapInvitacionesDbError(error);
    return errorResponse(mapped.code, mapped.status);
  }

  return deliverInvitation({
    invitacionId,
    tenantId,
    actorId: user.id,
    email,
    nombre,
    evento: 'invitacion_creada',
  });
}
