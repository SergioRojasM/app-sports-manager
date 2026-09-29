import { Suspense } from 'react';
import { EventoWizardPage } from '@/components/portal/gestion-eventos/wizard';

type NuevoEventoPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function NuevoEventoPage({ params }: NuevoEventoPageProps) {
  const { tenant_id: tenantId } = await params;

  // The wizard keeps the current step in ?paso (useSearchParams), which requires a Suspense boundary
  return (
    <Suspense>
      <EventoWizardPage tenantId={tenantId} />
    </Suspense>
  );
}
