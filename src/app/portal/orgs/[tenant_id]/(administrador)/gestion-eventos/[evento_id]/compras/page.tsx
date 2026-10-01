import { EventoComprasPage } from '@/components/portal/gestion-eventos/compras';

type EventoComprasRouteProps = {
  params: Promise<{ tenant_id: string; evento_id: string }>;
};

export default async function EventoComprasRoute({ params }: EventoComprasRouteProps) {
  const { tenant_id: tenantId, evento_id: eventoId } = await params;
  return <EventoComprasPage key={eventoId} tenantId={tenantId} eventoId={eventoId} />;
}
