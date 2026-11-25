import 'server-only';
import { redirect } from 'next/navigation';
import { getCachedTenantAccess } from '@/lib/portal/tenant-access.cache';
import { createClient } from '@/services/supabase/server';

/**
 * "Eventos Check-in" lives under `(shared)`, which also admits `usuario` members; only admins and
 * trainers may use it (US-0131). The check-in RPCs enforce the same rule server-side.
 */
export async function requireCheckinStaff(tenantId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal/orgs')}`);
  }

  const decision = await getCachedTenantAccess(supabase, user.id, tenantId);
  if (!decision.allowed || (decision.role !== 'administrador' && decision.role !== 'entrenador')) {
    redirect(`/portal/orgs/${tenantId}`);
  }
}
