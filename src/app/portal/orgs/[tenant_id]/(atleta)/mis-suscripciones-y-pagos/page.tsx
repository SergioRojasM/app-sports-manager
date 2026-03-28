import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { tenantService } from '@/services/supabase/portal/tenant.service';
import { fetchMisSuscripcionesTenant } from '@/services/supabase/portal/mis-suscripciones.service';
import { MisSuscripcionesYPagosPage } from '@/components/portal/mis-suscripciones-y-pagos';

type PageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function MisSuscripcionesYPagosTenantPage({ params }: PageProps) {
  const { tenant_id: tenantId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const decision = await tenantService.canUserAccessTenant(supabase, user.id, tenantId);

  if (!decision.allowed || decision.role !== 'usuario') {
    redirect(`/portal/orgs/${tenantId}`);
  }

  const suscripciones = await fetchMisSuscripcionesTenant(supabase, tenantId, user.id);

  return (
    <MisSuscripcionesYPagosPage
      suscripciones={suscripciones}
      tenantId={tenantId}
      userId={user.id}
    />
  );
}
