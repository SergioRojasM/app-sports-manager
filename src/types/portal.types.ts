export type UserRole = 'administrador' | 'atleta' | 'entrenador';

export const VALID_ROLES: readonly UserRole[] = ['administrador', 'atleta', 'entrenador'] as const;

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

/** Full profile fetched from public.usuarios joined with public.roles. */
export type UserProfile = PortalDisplayProfile & {
  id: string;
  activo: boolean;
  tenant_id: string;
  rol_id: string;
  role: UserRole;
};

export const ROLE_MENU_CONFIG: Record<UserRole, MenuItem[]> = {
  administrador: [
    { label: 'Gestión de Organización', href: '/portal/gestion-organizacion', icon: 'corporate_fare' },
    { label: 'Gestión de Escenarios', href: '/portal/gestion-escenarios', icon: 'stadium' },
    { label: 'Gestión de Entrenamientos', href: '/portal/gestion-entrenamientos', icon: 'fitness_center' },
  ],
  atleta: [
    { label: 'Perfil', href: '/portal/perfil', icon: 'person' },
    { label: 'Entrenamientos Disponibles', href: '/portal/entrenamientos-disponibles', icon: 'directions_run' },
  ],
  entrenador: [
    { label: 'Perfil', href: '/portal/perfil', icon: 'person' },
    { label: 'Gestión de Entrenamientos', href: '/portal/gestion-entrenamientos', icon: 'fitness_center' },
    { label: 'Atletas', href: '/portal/atletas', icon: 'groups' },
  ],
};
