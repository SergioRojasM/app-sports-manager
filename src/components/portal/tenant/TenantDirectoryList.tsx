'use client';

import { useMemo, useState } from 'react';
import { TenantIdentityCard } from '@/components/portal/tenant/TenantIdentityCard';
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
      return `${base}/entrenamientos-disponibles`;
  }
}

export function TenantDirectoryList({ organizations }: TenantDirectoryListProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((first, second) => first.identity.name.localeCompare(second.identity.name)),
    [organizations],
  );

  return (
    <div className="space-y-4">
      {feedback ? (
        <div className="rounded-lg border border-amber-300/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-100" role="status">
          {feedback}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sortedOrganizations.map((organization) => {
          const role = organization.userMembershipRole;

          return (
            <TenantIdentityCard
              key={organization.identity.tenantId}
              identity={organization.identity}
              actionLabel={organization.canAccess ? 'Ingresar' : 'Suscribirse'}
              actionHref={organization.canAccess && role ? getDefaultTenantPath(organization.identity.tenantId, role) : undefined}
              actionVariant={organization.canAccess ? 'access' : 'subscribe'}
              onActionClick={
                organization.canAccess
                  ? undefined
                  : () =>
                      setFeedback(
                        `La suscripción para \"${organization.identity.name}\" todavía no está disponible.`,
                      )
              }
            />
          );
        })}
      </div>
    </div>
  );
}
