import { FormulariosPage } from '@/components/portal/formularios';

type GestionFormulariosTenantPageProps = {
	params: Promise<{ tenant_id: string }>;
};

export default async function GestionFormulariosTenantPage({
	params,
}: GestionFormulariosTenantPageProps) {
	const { tenant_id: tenantId } = await params;

	return <FormulariosPage tenantId={tenantId} />;
}
