'use client';

import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import { PlanesPage } from '@/components/portal/planes';
import { PlanesViewPage } from '@/components/portal/planes/PlanesViewPage';
import { GritEmptyState } from '@/components/ui';

type PlanesRolePageProps = {
  tenantId: string;
};

export function PlanesRolePage({ tenantId }: PlanesRolePageProps) {
  const { loading, role } = useTenantAccess(tenantId);

  if (loading || !role) {
    return (
      <div role="status">
        <GritEmptyState icon="hourglass_empty" title="Cargando planes…" />
      </div>
    );
  }

  if (role === 'administrador') {
    return <PlanesPage tenantId={tenantId} />;
  }

  return <PlanesViewPage tenantId={tenantId} role={role} />;
}
