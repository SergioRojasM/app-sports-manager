'use client';

import { useMemo } from 'react';
import { TenantIdentityCard } from '@/components/portal/tenant/TenantIdentityCard';
import { SolicitarAccesoButton } from '@/components/portal/tenant/SolicitarAccesoButton';
import type { PortalTenantListItem } from '@/types/portal/tenant.types';
import type { UserRole } from '@/types/portal.types';

type TenantDirectoryListProps = {
  organizations: PortalTenantListItem[];
};

function getDefaultTenantPath(tenantId: string, role: UserRole): string {
  const base = `/portal/orgs/${tenantId}`;

  switch (role) {
    case 'administrador':
      return `${base}/gestion-organizacion`;
    case 'entrenador':
      return `${base}/atletas`;
    case 'usuario':
    default:
      return `${base}/landing-org`;
  }
}

export function TenantDirectoryList({ organizations }: TenantDirectoryListProps) {
  const sortedOrganizations = useMemo(
    () => [...organizations].sort((first, second) => first.identity.name.localeCompare(second.identity.name)),
    [organizations],
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {sortedOrganizations.map((organization) => {
        const role = organization.userMembershipRole;

        if (organization.canAccess && role) {
          return (
            <TenantIdentityCard
              key={organization.identity.tenantId}
              identity={organization.identity}
              actionLabel="Ingresar"
              actionHref={getDefaultTenantPath(organization.identity.tenantId, role)}
              actionVariant="access"
            />
          );
        }

        return (
          <TenantIdentityCard
            key={organization.identity.tenantId}
            identity={organization.identity}
            customAction={<SolicitarAccesoButton tenantId={organization.identity.tenantId} />}
          />
        );
      })}
    </div>
  );
}
