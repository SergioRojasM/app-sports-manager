import { EntrenamientosPage } from '@/components/portal/entrenamientos';

type GestionEntrenamientosTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionEntrenamientosTenantPage({
  params,
}: GestionEntrenamientosTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  return <EntrenamientosPage tenantId={tenantId} />;
}
