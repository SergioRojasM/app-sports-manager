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

export const ROLE_MENU_CONFIG: Record<UserRole, MenuItem[]> = {
  administrador: [
    { label: 'Organizaciones Disponibles', href: '/portal/gestion-organizacion', icon: 'corporate_fare' },
  ],
  usuario: [
    { label: 'Organizaciones Disponibles', href: '/portal/gestion-organizacion', icon: 'corporate_fare' },
  ],
  entrenador: [
    { label: 'Organizaciones Disponibles', href: '/portal/gestion-organizacion', icon: 'corporate_fare' },
  ],
};
