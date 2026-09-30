import { Suspense } from 'react';
import type { Metadata } from 'next';
import { EventoDetalleLandingPage } from '@/components/landing/eventos';

export const metadata: Metadata = {
  title: 'Evento | GRIT Arena',
  description: 'Detalle de un evento: cronograma, qué incluye, entrenadores, entradas y métodos de pago.',
};

/**
 * Public event page (US-0120). Outside `/portal`, so `middleware.ts` does not require a session.
 * Data is fetched client-side from `eventos` only.
 */
export default async function EventoPublicoDetallePage({ params }: { params: Promise<{ event_id: string }> }) {
  const { event_id: eventoId } = await params;

  return (
    // The page reads `from` / `entradas` via useSearchParams, which must sit under Suspense
    <Suspense fallback={null}>
      <EventoDetalleLandingPage eventoId={eventoId} />
    </Suspense>
  );
}
