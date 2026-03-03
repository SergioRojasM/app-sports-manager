import { EquipoPage } from '@/components/portal/gestion-equipo';

type GestionEquipoTenantPageProps = {
	params: Promise<{ tenant_id: string }>;
};

export default async function GestionEquipoTenantPage({
	params,
}: GestionEquipoTenantPageProps) {
	const { tenant_id: tenantId } = await params;

	return <EquipoPage tenantId={tenantId} />;
}
