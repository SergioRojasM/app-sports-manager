import type { Metadata } from 'next';
import { ComingSoonPage } from '@/components/landing/ComingSoonPage';

export const metadata: Metadata = {
  title: 'Atletas — GRIT Arena',
  description: 'Descubre atletas de organizaciones deportivas en GRIT Arena.',
};

export default function Page() {
  return (
    <ComingSoonPage
      title="Atletas"
      description="Descubre atletas de organizaciones deportivas en GRIT Arena."
    />
  );
}
