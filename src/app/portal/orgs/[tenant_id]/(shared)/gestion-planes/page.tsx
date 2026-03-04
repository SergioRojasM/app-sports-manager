import { PlanesRolePage } from '@/components/portal/planes/PlanesRolePage';

type GestionPlanesTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionPlanesTenantPage({
  params,
}: GestionPlanesTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  return <PlanesRolePage tenantId={tenantId} />;
}
