import { Suspense } from 'react';
import { GestionEventosPage } from '@/components/portal/gestion-eventos';

type GestionEventosTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionEventosTenantPage({ params }: GestionEventosTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  // useSearchParams (view switcher) requires a Suspense boundary in the App Router
  return (
    <Suspense>
      <GestionEventosPage tenantId={tenantId} />
    </Suspense>
  );
}
