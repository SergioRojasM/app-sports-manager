import { redirect } from 'next/navigation';
import { ControlIngresoPage } from '@/components/portal/control-ingreso';
import { requireCheckinStaff } from '@/lib/portal/control-ingreso.guard';
import { isUuid } from '@/lib/portal/privileged-route';

type ControlIngresoEventoRouteProps = {
  params: Promise<{ tenant_id: string; evento_id: string }>;
};

export default async function ControlIngresoEventoRoute({ params }: ControlIngresoEventoRouteProps) {
  const { tenant_id: tenantId, evento_id: eventoId } = await params;
  await requireCheckinStaff(tenantId);
  if (!isUuid(eventoId)) {
    redirect(`/portal/orgs/${tenantId}/control-ingreso`);
  }
  return <ControlIngresoPage key={eventoId} tenantId={tenantId} eventoId={eventoId} />;
}
