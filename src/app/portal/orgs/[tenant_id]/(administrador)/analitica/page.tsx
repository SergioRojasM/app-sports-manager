import { AnaliticaPage } from '@/components/portal/analitica';

type AnaliticaTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function AnaliticaTenantPage({ params }: AnaliticaTenantPageProps) {
  const { tenant_id: tenantId } = await params;
  return <AnaliticaPage tenantId={tenantId} />;
}