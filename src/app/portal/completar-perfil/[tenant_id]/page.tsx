import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { getCachedTenantAccess } from '@/lib/portal/tenant-access.cache';
import { CompletarPerfilPage } from '@/components/portal/perfil';

type CompletarPerfilRouteProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function CompletarPerfilRoute({ params }: CompletarPerfilRouteProps) {
  const { tenant_id: tenantId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal/orgs')}`);
  }

  const decision = await getCachedTenantAccess(supabase, user.id, tenantId);

  if (decision.pendingActivation) {
    redirect(`/portal/activar-cuenta/${tenantId}`);
  }

  if (!decision.allowed || !decision.role) {
    redirect('/portal/orgs');
  }

  if (!decision.profileIncomplete) {
    redirect(`/portal/orgs/${tenantId}`);
  }

  const { data: tenant } = await supabase.from('tenants').select('nombre').eq('id', tenantId).maybeSingle();

  return (
    <CompletarPerfilPage
      tenantId={tenantId}
      tenantNombre={tenant?.nombre ?? 'Esta organización'}
      missingFields={decision.profileMissingFields}
    />
  );
}
