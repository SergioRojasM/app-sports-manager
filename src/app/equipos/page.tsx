import type { Metadata } from 'next';
import { ComingSoonPage } from '@/components/landing/ComingSoonPage';

export const metadata: Metadata = {
  title: 'Equipos y clubes — GRIT Arena',
  description: 'Descubre equipos y clubes deportivos en GRIT Arena.',
};

export default function Page() {
  return (
    <ComingSoonPage
      title="Equipos y clubes"
      description="Descubre equipos y clubes deportivos en GRIT Arena."
    />
  );
}
