'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import { useTenantName } from '@/hooks/portal/tenant/useTenantName';
import { useFormularioPlantillaName } from '@/hooks/portal/formularios/useFormularioPlantillaName';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maps URL path slugs to human-readable labels. */
const SLUG_LABELS: Record<string, string> = {
  orgs: 'Orgs',
  'gestion-organizacion': 'Organización',
  'gestion-escenarios': 'Escenarios',
  'gestion-disciplinas': 'Disciplinas',
  'gestion-servicios': 'Servicios',
  'gestion-formularios': 'Formularios',
  'gestion-entrenamientos': 'Entrenamientos',
  'gestion-eventos': 'Eventos',
  eventos: 'Eventos',
  nuevo: 'Nuevo evento',
  editar: 'Editar evento',
  'gestion-planes': 'Planes',
  'entrenamientos-disponibles': 'Entrenamientos Disponibles',
  atletas: 'Atletas',
  perfil: 'Perfil',
  analitica: 'Analítica',
  'mis-reservas': 'Mis reservas',
  'mis-entradas': 'Mis entradas',
  notificaciones: 'Notificaciones',
  compras: 'Compras',
  'control-ingreso': 'Control de ingreso',
  'mis-suscripciones': 'Mis suscripciones',
  'mis-suscripciones-y-pagos': 'Suscripciones y pagos',
  'landing-org': 'Organización',
  invitaciones: 'Invitaciones',
  'gestion-reservas': 'Reservas',
  'gestion-equipo': 'Equipo',
  'gestion-suscripciones': 'Suscripciones',
  'activar-cuenta': 'Activar cuenta',
  'completar-perfil': 'Completar perfil',
  inicio: 'Inicio',
};

type BreadcrumbSegment = {
  label: string;
  href: string;
  isLast: boolean;
};

type PortalBreadcrumbProps = {
  /**
   * topbar = inside PortalHeader at ≥1024px (v3 Topbar `vwVLa`) · inline = standalone row at the
   * top of <main> below 1024px. The layout shows exactly one of them per breakpoint (US-0141).
   */
  variant?: 'topbar' | 'inline';
};

export function PortalBreadcrumb({ variant = 'inline' }: PortalBreadcrumbProps) {
  const pathname = usePathname();

  const tenantId = useMemo(() => {
    const match = pathname.match(/^\/portal\/orgs\/([^/]+)/);
    const id = match?.[1];
    return id && UUID_RE.test(id) ? id : undefined;
  }, [pathname]);

  const tenantName = useTenantName(tenantId);

  // Any UUID segment after the tenant id (e.g. a plantilla id under gestion-formularios/{id}) is
  // resolved separately so it isn't mislabeled with the tenant's name.
  const secondaryUuidId = useMemo(() => {
    const parts = pathname.split('/');
    const uuidIndexes = parts.map((part, index) => (UUID_RE.test(part) ? index : -1)).filter((index) => index >= 0);
    const secondIndex = uuidIndexes[1];
    // Only form templates have a name lookup; event ids get a static label (US-0119)
    return secondIndex !== undefined && parts[secondIndex - 1] === 'gestion-formularios' ? parts[secondIndex] : undefined;
  }, [pathname]);

  const plantillaName = useFormularioPlantillaName(secondaryUuidId);

  const segments = useMemo((): BreadcrumbSegment[] => {
    const parts = pathname.split('/').filter(Boolean);
    const result: BreadcrumbSegment[] = [];
    let accumulated = '';
    let uuidsSeen = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated += `/${part}`;
      const isLast = i === parts.length - 1;

      if (i === 0 && part === 'portal') {
        result.push({ label: 'Inicio', href: '/portal', isLast });
      } else if (UUID_RE.test(part) && parts[i - 1] === 'eventos' && parts[i - 2] === 'portal') {
        // Portal event page (US-0120): never render the raw event id
        result.push({ label: 'Evento', href: accumulated, isLast });
      } else if (UUID_RE.test(part)) {
        uuidsSeen += 1;
        if (uuidsSeen > 1 && parts[i - 1] === 'gestion-eventos') {
          // There is no page at /gestion-eventos/{id}; the crumb points at the edit wizard
          result.push({ label: 'Evento', href: `${accumulated}/editar`, isLast });
          continue;
        }
        if (uuidsSeen > 1 && parts[i - 1] === 'control-ingreso') {
          // Check-in screen of one event (US-0131)
          result.push({ label: 'Evento', href: accumulated, isLast });
          continue;
        }
        const label = uuidsSeen === 1 ? tenantName : plantillaName;
        result.push({ label: label ?? '…', href: accumulated, isLast });
      } else {
        result.push({ label: SLUG_LABELS[part] ?? part, href: accumulated, isLast });
      }
    }

    return result;
  }, [pathname, tenantName, plantillaName]);

  // Only render when there is more than the root "Inicio"
  if (segments.length <= 1) return null;

  const isTopbar = variant === 'topbar';

  // v3 Breadcrumb (`c3k2e`): muted crumbs and chevrons, the current page in subtext (US-0141)
  return (
    <div className={isTopbar ? 'min-w-0' : 'mx-auto w-full max-w-[1440px] px-4 pt-3 sm:px-6'}>
      <nav aria-label="Ruta de navegación">
        <ol
          className={cx(
            'flex items-center gap-2 font-grit-body text-xs text-grit-muted',
            isTopbar ? 'flex-nowrap' : 'flex-wrap',
          )}
        >
          {segments.map((seg, i) => (
            <li key={`${i}-${seg.href}`} className={cx('flex items-center gap-2', isTopbar ? 'min-w-0 shrink' : 'min-w-0')}>
              {i > 0 && <GritIcon name="chevron_right" size={12} className="shrink-0" />}
              {i === 0 && <GritIcon name="home" size={13} className="shrink-0" />}
              {seg.isLast ? (
                <span className="max-w-[60vw] truncate font-medium text-grit-subtext lg:max-w-[320px]" aria-current="page">
                  {seg.label}
                </span>
              ) : (
                <Link
                  href={seg.href}
                  className={cx('truncate rounded-grit-xs transition-colors hover:text-grit-text', isTopbar && 'max-w-[180px]', gritFocusRing)}
                >
                  {seg.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
