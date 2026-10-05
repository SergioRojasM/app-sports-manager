import { Suspense } from 'react';
import { EventosPublicosPage } from '@/components/portal/eventos';

export default function Page() {
  return (
    // useObtenerEntrada reads search params, which must sit under Suspense
    <Suspense fallback={null}>
      <EventosPublicosPage />
    </Suspense>
  );
}
