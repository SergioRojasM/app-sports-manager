import { GestionOrganizacionPage } from '@/components/portal/tenant/GestionOrganizacionPage';

type GestionOrganizacionTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionOrganizacionTenantPage({
  params,
}: GestionOrganizacionTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  return <GestionOrganizacionPage tenantId={tenantId} />;
}
