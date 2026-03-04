import { GestionSuscripcionesPage } from '@/components/portal/gestion-suscripciones';

type GestionSuscripcionesTenantPageProps = {
	params: Promise<{ tenant_id: string }>;
};

export default async function GestionSuscripcionesTenantPage({
	params,
}: GestionSuscripcionesTenantPageProps) {
	const { tenant_id: tenantId } = await params;

	return <GestionSuscripcionesPage tenantId={tenantId} />;
}
