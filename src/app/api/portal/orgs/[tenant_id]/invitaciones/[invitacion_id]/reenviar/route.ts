import type { NextRequest } from 'next/server';
import { createClient } from '@/services/supabase/server';
import { deliverInvitation } from '@/lib/portal/invitaciones-delivery';
import { mapInvitacionesDbError } from '@/lib/portal/invitaciones-errors';
import { errorResponse, isUuid } from '@/lib/portal/privileged-route';

type RouteContext = { params: Promise<{ tenant_id: string; invitacion_id: string }> };

type ReenvioRow = {
  invitacion_id: string;
  tenant_id: string;
  email: string;
  nombre: string | null;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { tenant_id: tenantId, invitacion_id: invitacionId } = await context.params;
  if (!isUuid(tenantId) || !isUuid(invitacionId)) return errorResponse('not_found', 404);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse('unauthenticated', 401);

  const { data, error } = await supabase
    .rpc('reenviar_invitacion_tenant', { p_invitacion_id: invitacionId })
    .maybeSingle<ReenvioRow>();

  if (error || !data) {
    const mapped = mapInvitacionesDbError(error);
    return errorResponse(mapped.code, mapped.status);
  }

  // The RPC authorizes against the invitation's own tenant; the path must match it too.
  if (data.tenant_id !== tenantId) return errorResponse('not_found', 404);

  return deliverInvitation({
    invitacionId: data.invitacion_id,
    tenantId,
    actorId: user.id,
    email: data.email,
    nombre: data.nombre,
    evento: 'invitacion_reenviada',
  });
}
