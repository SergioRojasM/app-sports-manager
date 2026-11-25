import { ActivarCuentaPage } from '@/components/portal/invitaciones';

type ActivarCuentaRouteProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function ActivarCuentaRoute({ params }: ActivarCuentaRouteProps) {
  const { tenant_id: tenantId } = await params;
  return <ActivarCuentaPage tenantId={tenantId} />;
}
