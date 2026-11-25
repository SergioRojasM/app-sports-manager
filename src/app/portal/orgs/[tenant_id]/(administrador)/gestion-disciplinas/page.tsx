import { Suspense } from 'react';
import { DisciplinesPage } from '@/components/portal/disciplines';

type GestionDisciplinasTenantPageProps = {
	params: Promise<{ tenant_id: string }>;
};

export default async function GestionDisciplinasTenantPage({
	params,
}: GestionDisciplinasTenantPageProps) {
	const { tenant_id: tenantId } = await params;

	// DisciplinesPage reads the selected discipline from `?disciplina=` (useSearchParams)
	return (
		<Suspense>
			<DisciplinesPage tenantId={tenantId} />
		</Suspense>
	);
}
