import { Suspense } from 'react';
import { EventoWizardPage } from '@/components/portal/gestion-eventos/wizard';

type NuevoEventoPageProps = {
  params: Promise<{ tenant_id: string }>;
  searchParams: Promise<{ duplicar?: string | string[]; desdeEntrenamiento?: string | string[] }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** First value of a query param, accepted only when it is a UUID. */
function uuidParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first && UUID_RE.test(first) ? first : undefined;
}

export default async function NuevoEventoPage({ params, searchParams }: NuevoEventoPageProps) {
  const { tenant_id: tenantId } = await params;
  const { duplicar, desdeEntrenamiento } = await searchParams;

  // ?duplicar={eventoId} pre-fills the wizard with a copy of that event (US-0122);
  // ?desdeEntrenamiento={entrenamientoId} pre-fills it from a future training (US-0132). Duplicate wins; anything else is ignored
  const duplicarDeId = uuidParam(duplicar);
  const desdeEntrenamientoId = duplicarDeId ? undefined : uuidParam(desdeEntrenamiento);
  const wizardKey = duplicarDeId ?? (desdeEntrenamientoId ? `entrenamiento-${desdeEntrenamientoId}` : 'nuevo');

  // The wizard keeps the current step in ?paso (useSearchParams), which requires a Suspense boundary
  return (
    <Suspense>
      <EventoWizardPage
        key={wizardKey}
        tenantId={tenantId}
        duplicarDeId={duplicarDeId}
        desdeEntrenamientoId={desdeEntrenamientoId}
      />
    </Suspense>
  );
}
