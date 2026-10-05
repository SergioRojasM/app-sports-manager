import { ControlIngresoEventosPage } from '@/components/portal/control-ingreso';
import { requireCheckinStaff } from '@/lib/portal/control-ingreso.guard';

type ControlIngresoRouteProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function ControlIngresoRoute({ params }: ControlIngresoRouteProps) {
  const { tenant_id: tenantId } = await params;
  await requireCheckinStaff(tenantId);
  return <ControlIngresoEventosPage tenantId={tenantId} />;
}
