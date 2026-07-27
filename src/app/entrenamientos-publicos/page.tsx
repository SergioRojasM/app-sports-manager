import type { Metadata } from 'next';
import { PublicEntrenamientosLandingPage } from '@/components/landing/entrenamientos-publicos';

export const metadata: Metadata = {
  title: 'Entrenamientos disponibles — GRIT Arena',
  description: 'Descubre entrenamientos públicos de organizaciones en GRIT Arena y regístrate para reservar tu cupo.',
};

export default function Page() {
  return <PublicEntrenamientosLandingPage />;
}
