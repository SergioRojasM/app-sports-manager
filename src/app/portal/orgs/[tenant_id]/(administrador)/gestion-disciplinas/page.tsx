import { DisciplinesPage } from '@/components/portal/disciplines';

type GestionDisciplinasTenantPageProps = {
	params: Promise<{ tenant_id: string }>;
};

export default async function GestionDisciplinasTenantPage({
	params,
}: GestionDisciplinasTenantPageProps) {
	const { tenant_id: tenantId } = await params;

	return <DisciplinesPage tenantId={tenantId} />;
}
