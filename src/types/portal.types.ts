export type UserRole = 'administrador' | 'usuario' | 'entrenador';

export const VALID_ROLES: readonly UserRole[] = ['administrador', 'usuario', 'entrenador'] as const;

export type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

/** Minimal display data stored in the portal_profile cookie (no sensitive info). */
export type PortalDisplayProfile = {
  nombre: string;
  apellido: string;
  foto_url: string | null;
  email: string;
};

export type UserMembershipContext = {
  tenant_id: string;
  rol_id: string;
  tenant_nombre: string | null;
};

/** Full profile fetched from public.usuarios + active membership in public.miembros_tenant. */
export type UserProfile = PortalDisplayProfile & {
  id: string;
  activo: boolean;
  tenant_id: string;
  rol_id: string;
  role: UserRole;
  membership: UserMembershipContext;
};

const BASE_MENU_ITEM: MenuItem = {
  label: 'Organizaciones Disponibles',
  href: '/portal/orgs',
  icon: 'corporate_fare',
};

const SHARED_TENANT_ITEMS: Array<{ label: string; path: string; icon: string }> = [
  // { label: 'Perfil', path: 'perfil', icon: 'person' },
];

const ROLE_TENANT_ITEMS: Record<UserRole, Array<{ label: string; path: string; icon: string }>> = {
  administrador: [
    { label: 'Organización', path: 'gestion-organizacion', icon: 'business_center' },
    { label: 'Escenarios', path: 'gestion-escenarios', icon: 'stadium' },
    { label: 'Disciplinas', path: 'gestion-disciplinas', icon: 'sports' },
    { label: 'Entrenamientos', path: 'gestion-entrenamientos', icon: 'exercise' },
    { label: 'Planes', path: 'gestion-planes', icon: 'card_membership' },
    { label: 'Equipo', path: 'gestion-equipo', icon: 'groups' },
  ],
  usuario: [
    { label: 'Entrenamientos Disponibles', path: 'gestion-entrenamientos', icon: 'directions_run' },
    { label: 'Planes', path: 'gestion-planes', icon: 'card_membership' },
  ],
  entrenador: [
    { label: 'Atletas', path: 'atletas', icon: 'groups' },
    { label: 'Entrenamientos', path: 'gestion-entrenamientos', icon: 'exercise' },
    { label: 'Planes', path: 'gestion-planes', icon: 'card_membership' },
  ],
};

export function resolvePortalMenu(role: UserRole, tenantId?: string): MenuItem[] {
  if (!tenantId) {
    return [BASE_MENU_ITEM];
  }

  const tenantPrefix = `/portal/orgs/${tenantId}`;

  const roleItems = ROLE_TENANT_ITEMS[role].map((item) => ({
    label: item.label,
    href: `${tenantPrefix}/${item.path}`,
    icon: item.icon,
  }));

  const sharedItems = SHARED_TENANT_ITEMS.map((item) => ({
    label: item.label,
    href: `${tenantPrefix}/${item.path}`,
    icon: item.icon,
  }));

  return [BASE_MENU_ITEM, ...roleItems, ...sharedItems];
};
