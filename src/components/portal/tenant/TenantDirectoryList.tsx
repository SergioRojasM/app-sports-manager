'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { TenantDirectoryCard } from '@/components/portal/tenant/TenantDirectoryCard';
import { SolicitarAccesoButton } from '@/components/portal/tenant/SolicitarAccesoButton';
import { VerPlanesButton } from '@/components/portal/planes-publicos';
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
      return `${base}/gestion-entrenamientos`;
    case 'usuario':
    default:
      return `${base}/gestion-entrenamientos`;
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

        const verPlanesAction = (
          <VerPlanesButton
            tenantId={organization.identity.tenantId}
            tenantNombre={organization.identity.name}
          />
        );

        const isMember = Boolean(organization.canAccess && role);

        return (
          <TenantDirectoryCard
            key={organization.identity.tenantId}
            identity={organization.identity}
            isMember={isMember}
            isPublic={organization.isPublic}
            primaryAction={
              isMember && role ? (
                <Link
                  href={getDefaultTenantPath(organization.identity.tenantId, role)}
                  className="inline-flex w-full items-center justify-center rounded-grit-md bg-grit-cyan px-4 py-2 font-grit-body text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan-light"
                >
                  Ingresar
                </Link>
              ) : (
                <SolicitarAccesoButton tenantId={organization.identity.tenantId} />
              )
            }
            secondaryAction={verPlanesAction}
          />
        );
      })}
    </div>
  );
}
