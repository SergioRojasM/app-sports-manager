import { Suspense } from 'react';
import { EventoDetallePortalPage } from '@/components/portal/eventos/detalle';

/** Portal event page (US-0120): public events plus the private ones of the user's tenants. */
export default async function EventoPortalDetallePage({ params }: { params: Promise<{ event_id: string }> }) {
  const { event_id: eventoId } = await params;

  return (
    // The page reads `from` / `entradas` via useSearchParams, which must sit under Suspense
    <Suspense fallback={null}>
      <EventoDetallePortalPage eventoId={eventoId} />
    </Suspense>
  );
}
