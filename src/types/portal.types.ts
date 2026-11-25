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

// Portal navigation model (US-0138)

/** Global "MENÚ" entries, identical inside and outside a tenant. */
export const GLOBAL_MENU_ITEMS: readonly MenuItem[] = [
  { label: 'Inicio', href: '/portal/inicio', icon: 'home' },
  { label: 'Organizaciones', href: '/portal/orgs', icon: 'corporate_fare' },
  { label: 'Eventos', href: '/portal/eventos', icon: 'emoji_events' },
  { label: 'Mis Suscripciones', href: '/portal/mis-suscripciones', icon: 'credit_card' },
  { label: 'Mis Reservas', href: '/portal/mis-reservas', icon: 'event_available' },
  { label: 'Mis Entradas', href: '/portal/mis-entradas', icon: 'confirmation_number' },
];

export type PortalNavLeaf = {
  kind: 'leaf';
  label: string;
  /** Path relative to `/portal/orgs/{tenantId}/`. */
  path: string;
  /** Material Symbols name; only top-level leaves render an icon. */
  icon?: string;
  roles: readonly UserRole[];
  labelByRole?: Partial<Record<UserRole, string>>;
};

export type PortalNavGroupId = 'administracion' | 'equipo' | 'entrenamientos' | 'eventos';

export type PortalNavGroup = {
  kind: 'group';
  id: PortalNavGroupId;
  label: string;
  icon: string;
  children: readonly PortalNavLeaf[];
};

export type PortalNavNode = PortalNavLeaf | PortalNavGroup;

export type ResolvedNavLeaf = { label: string; href: string; icon?: string };

export type ResolvedNavGroup = {
  id: PortalNavGroupId;
  label: string;
  icon: string;
  children: ResolvedNavLeaf[];
};

export type ResolvedNavNode = ({ kind: 'leaf' } & ResolvedNavLeaf) | ({ kind: 'group' } & ResolvedNavGroup);

const ADMIN: readonly UserRole[] = ['administrador'];
const ADMIN_TRAINER: readonly UserRole[] = ['administrador', 'entrenador'];

/**
 * Tenant "ORGANIZACIÓN" tree. Role visibility mirrors the route-group guards
 * ((administrador), (entrenador), (atleta), (shared)); hiding a link never replaces them.
 * There is intentionally no "Equipo › Reservas": `gestion-reservas` lives under Entrenamientos.
 */
export const TENANT_NAV_TREE: readonly PortalNavNode[] = [
  {
    kind: 'group',
    id: 'administracion',
    label: 'Administración',
    icon: 'tune',
    children: [
      { kind: 'leaf', label: 'Configuración', path: 'gestion-organizacion', roles: ADMIN },
      { kind: 'leaf', label: 'Escenarios', path: 'gestion-escenarios', roles: ADMIN },
      { kind: 'leaf', label: 'Disciplinas', path: 'gestion-disciplinas', roles: ADMIN },
      { kind: 'leaf', label: 'Servicios', path: 'gestion-servicios', roles: ADMIN },
      { kind: 'leaf', label: 'Planes', path: 'gestion-planes', roles: ADMIN_TRAINER },
    ],
  },
  {
    kind: 'group',
    id: 'equipo',
    label: 'Equipo',
    icon: 'group',
    children: [
      { kind: 'leaf', label: 'Miembros', path: 'gestion-equipo', roles: ADMIN },
      { kind: 'leaf', label: 'Atletas', path: 'atletas', roles: ['entrenador'] },
      { kind: 'leaf', label: 'Suscripciones', path: 'gestion-suscripciones', roles: ADMIN },
    ],
  },
  {
    kind: 'group',
    id: 'entrenamientos',
    label: 'Entrenamientos',
    icon: 'fitness_center',
    children: [
      {
        kind: 'leaf',
        label: 'Calendario',
        path: 'gestion-entrenamientos',
        roles: ['administrador', 'entrenador', 'usuario'],
        labelByRole: { usuario: 'Entrenamientos disponibles' },
      },
      { kind: 'leaf', label: 'Reservas', path: 'gestion-reservas', roles: ADMIN_TRAINER },
      { kind: 'leaf', label: 'Formularios', path: 'gestion-formularios', roles: ADMIN },
    ],
  },
  {
    kind: 'group',
    id: 'eventos',
    label: 'Eventos',
    icon: 'emoji_events',
    children: [
      { kind: 'leaf', label: 'Calendario', path: 'gestion-eventos', roles: ADMIN },
      { kind: 'leaf', label: 'Check-in', path: 'control-ingreso', roles: ADMIN_TRAINER },
    ],
  },
  // Top-level for athletes so they never see an "Administración" heading
  { kind: 'leaf', label: 'Planes', path: 'gestion-planes', icon: 'card_membership', roles: ['usuario'] },
  { kind: 'leaf', label: 'Analítica', path: 'analitica', icon: 'bar_chart', roles: ADMIN },
];

export function resolveGlobalMenu(): MenuItem[] {
  return [...GLOBAL_MENU_ITEMS];
}

export function resolveTenantNav(role: UserRole, tenantId: string): ResolvedNavNode[] {
  const tenantPrefix = `/portal/orgs/${tenantId}`;
  const resolveLeaf = (leaf: PortalNavLeaf): ResolvedNavLeaf => ({
    label: leaf.labelByRole?.[role] ?? leaf.label,
    href: `${tenantPrefix}/${leaf.path}`,
    icon: leaf.icon,
  });

  return TENANT_NAV_TREE.flatMap((node): ResolvedNavNode[] => {
    if (node.kind === 'leaf') {
      return node.roles.includes(role) ? [{ kind: 'leaf', ...resolveLeaf(node) }] : [];
    }
    const children = node.children.filter((leaf) => leaf.roles.includes(role)).map(resolveLeaf);
    return children.length > 0
      ? [{ kind: 'group', id: node.id, label: node.label, icon: node.icon, children }]
      : [];
  });
}

/** Longest href that equals the pathname or is a path prefix of it, so exactly one link is active. */
export function findActiveHref(pathname: string, hrefs: readonly string[]): string | null {
  let active: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (active === null || href.length > active.length)) {
      active = href;
    }
  }
  return active;
}
