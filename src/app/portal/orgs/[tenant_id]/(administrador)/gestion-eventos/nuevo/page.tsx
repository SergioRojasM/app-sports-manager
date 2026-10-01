import { Suspense } from 'react';
import { EventoWizardPage } from '@/components/portal/gestion-eventos/wizard';

type NuevoEventoPageProps = {
  params: Promise<{ tenant_id: string }>;
  searchParams: Promise<{ duplicar?: string | string[] }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NuevoEventoPage({ params, searchParams }: NuevoEventoPageProps) {
  const { tenant_id: tenantId } = await params;
  const { duplicar } = await searchParams;

  // ?duplicar={eventoId} pre-fills the wizard with a copy of that event (US-0122); anything else is ignored
  const duplicarValue = Array.isArray(duplicar) ? duplicar[0] : duplicar;
  const duplicarDeId = duplicarValue && UUID_RE.test(duplicarValue) ? duplicarValue : undefined;

  // The wizard keeps the current step in ?paso (useSearchParams), which requires a Suspense boundary
  return (
    <Suspense>
      <EventoWizardPage key={duplicarDeId ?? 'nuevo'} tenantId={tenantId} duplicarDeId={duplicarDeId} />
    </Suspense>
  );
}
