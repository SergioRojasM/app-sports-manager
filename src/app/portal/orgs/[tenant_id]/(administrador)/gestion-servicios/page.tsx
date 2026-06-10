import { ServiciosPage } from '@/components/portal/servicios';

type GestionServiciosTenantPageProps = {
	params: Promise<{ tenant_id: string }>;
};

export default async function GestionServiciosTenantPage({
	params,
}: GestionServiciosTenantPageProps) {
	const { tenant_id: tenantId } = await params;

	return <ServiciosPage tenantId={tenantId} />;
}
