import type { UserRole } from '@/types/portal.types';

/** Landing path of a tenant for the user's role (used by "Ingresar" in the organization marketplace). */
export function getDefaultTenantPath(tenantId: string, role: UserRole): string {
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
