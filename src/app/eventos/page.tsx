import { Suspense } from 'react';
import type { Metadata } from 'next';
import { EventosLandingPage } from '@/components/landing/eventos';

export const metadata: Metadata = {
  title: 'Eventos disponibles — GRIT Arena',
  description: 'Descubre eventos de los equipos en GRIT Arena y obtén tu entrada.',
};

export default function Page() {
  return (
    // useObtenerEntrada reads search params, which must sit under Suspense
    <Suspense fallback={null}>
      <EventosLandingPage />
    </Suspense>
  );
}
