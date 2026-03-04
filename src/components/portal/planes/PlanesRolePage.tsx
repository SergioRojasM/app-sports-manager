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
      <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
        Cargando...
      </div>
    );
  }

  if (role === 'administrador') {
    return <PlanesPage tenantId={tenantId} />;
  }

  return <PlanesViewPage tenantId={tenantId} role={role} />;
}
