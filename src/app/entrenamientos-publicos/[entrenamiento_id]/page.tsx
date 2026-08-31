import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicTrainingDetallePage } from '@/components/landing/entrenamientos-publicos/detalle';

export const metadata: Metadata = {
  title: 'Entrenamiento público | GRIT Arena',
  description: 'Detalle de un entrenamiento público: cronograma, qué incluye, ubicación y precios.',
};

/**
 * Public detail page for a single published training (US-0109).
 *
 * Deliberately outside `/portal` and absent from `middleware.ts`'s
 * `protectedPaths`, so it loads for anonymous visitors arriving from an
 * external link. Data is fetched client-side from the anon-safe view, matching
 * the rest of this feature slice.
 */
export default async function EntrenamientoPublicoDetallePage({
  params,
}: {
  params: Promise<{ entrenamiento_id: string }>;
}) {
  const { entrenamiento_id: entrenamientoId } = await params;

  return (
    // The page reads `from` via useSearchParams, which must sit under a
    // Suspense boundary to avoid opting the whole route into client bailout.
    <Suspense fallback={null}>
      <PublicTrainingDetallePage entrenamientoId={entrenamientoId} />
    </Suspense>
  );
}
