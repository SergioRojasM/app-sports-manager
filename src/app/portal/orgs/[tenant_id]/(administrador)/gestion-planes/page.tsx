import { PlanesPage } from '@/components/portal/planes';

type GestionPlanesTenantPageProps = {
	params: Promise<{ tenant_id: string }>;
};

export default async function GestionPlanesTenantPage({
	params,
}: GestionPlanesTenantPageProps) {
	const { tenant_id: tenantId } = await params;

	return <PlanesPage tenantId={tenantId} />;
}
