import { GestionReservasPage } from '@/components/portal/gestion-reservas';

type GestionReservasTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionReservasTenantPage({
  params,
}: GestionReservasTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  return <GestionReservasPage tenantId={tenantId} />;
}
