import { ScenariosPage } from '@/components/portal/scenarios';

type GestionEscenariosTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionEscenariosTenantPage({
  params,
}: GestionEscenariosTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  return (
    <ScenariosPage tenantId={tenantId} />
  );
}
