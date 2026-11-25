'use client';

import { GritButton, GritEmptyState } from '@/components/ui';
import type { TenantViewData } from '@/types/portal/tenant.types';
import { TenantContactCard } from './TenantContactCard';
import { TenantIdentityCard } from './TenantIdentityCard';

type TenantInfoCardsProps = {
  data: TenantViewData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  miembros: number | null;
  /** Opens the organization edit drawer. */
  onEdit: () => void;
};

/** Identity + contact row of the organization management page (`aYwNn` `GaV2m`). */
export function TenantInfoCards({ data, loading, error, onRetry, miembros, onEdit }: TenantInfoCardsProps) {
  if (loading) {
    return (
      <div role="status">
        <GritEmptyState icon="hourglass_empty" title="Cargando organización…" titleAs="h2" />
      </div>
    );
  }

  if (error) {
    return (
      <GritEmptyState
        icon="error"
        title="No pudimos cargar la organización"
        description={error}
        descriptionClassName="text-grit-danger"
        action={
          <GritButton variant="secondary" icon="refresh" onClick={onRetry}>
            Reintentar
          </GritButton>
        }
      />
    );
  }

  if (!data) {
    return <GritEmptyState icon="corporate_fare" title="La información de la organización no está disponible" />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <TenantIdentityCard identity={data.identity} isPublic={data.isPublic} miembros={miembros} />
      <TenantContactCard contact={data.contact} social={data.social} isPublic={data.isPublic} onConnect={onEdit} />
    </div>
  );
}
