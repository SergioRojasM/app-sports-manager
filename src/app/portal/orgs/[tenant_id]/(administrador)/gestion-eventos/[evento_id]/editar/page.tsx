import { Suspense } from 'react';
import { EventoWizardPage } from '@/components/portal/gestion-eventos/wizard';

type EditarEventoPageProps = {
  params: Promise<{ tenant_id: string; evento_id: string }>;
};

export default async function EditarEventoPage({ params }: EditarEventoPageProps) {
  const { tenant_id: tenantId, evento_id: eventoId } = await params;

  // The wizard keeps the current step in ?paso (useSearchParams), which requires a Suspense boundary
  return (
    <Suspense>
      <EventoWizardPage key={eventoId} tenantId={tenantId} eventoId={eventoId} />
    </Suspense>
  );
}
