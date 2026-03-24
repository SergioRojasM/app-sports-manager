import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { tenantService } from '@/services/supabase/portal/tenant.service';

function resolveTenantLandingPath(tenantId: string, role: 'administrador' | 'usuario' | 'entrenador'): string {
  switch (role) {
    case 'administrador':
      return `/portal/orgs/${tenantId}/gestion-organizacion`;
    case 'entrenador':
      return `/portal/orgs/${tenantId}/atletas`;
    case 'usuario':
    default:
      return `/portal/orgs/${tenantId}/gestion-entrenamientos`;
  }
}

type TenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function TenantRootPage({ params }: TenantPageProps) {
  const { tenant_id: tenantId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/portal/orgs');
  }

  const decision = await tenantService.canUserAccessTenant(supabase, user.id, tenantId);

  if (!decision.allowed || !decision.role) {
    redirect('/portal/orgs');
  }

  redirect(resolveTenantLandingPath(tenantId, decision.role));
}
