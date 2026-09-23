'use client';

import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import { PlanesPage } from '@/components/portal/planes';
import { PlanesViewPage } from '@/components/portal/planes/PlanesViewPage';

type PlanesRolePageProps = {
  tenantId: string;
};

export function PlanesRolePage({ tenantId }: PlanesRolePageProps) {
  const { loading, role } = useTenantAccess(tenantId);

  if (loading || !role) {
    return (
      <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
        Cargando...
      </div>
    );
  }

  if (role === 'administrador') {
    return <PlanesPage tenantId={tenantId} />;
  }

  return <PlanesViewPage tenantId={tenantId} role={role} />;
}
