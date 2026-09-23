'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { GritIcon } from '@/components/ui';
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
  'gestion-planes': 'Planes',
  'entrenamientos-disponibles': 'Entrenamientos Disponibles',
  atletas: 'Atletas',
  perfil: 'Perfil',
  'entrenamientos-publicos': 'Entrenamientos públicos',
  analitica: 'Analítica',
  'mis-reservas': 'Mis reservas',
  'mis-suscripciones': 'Mis suscripciones',
  'mis-suscripciones-y-pagos': 'Suscripciones y pagos',
  'landing-org': 'Organización',
  invitaciones: 'Invitaciones',
  'gestion-reservas': 'Reservas',
  'gestion-equipo': 'Equipo',
  'gestion-suscripciones': 'Suscripciones',
  'activar-cuenta': 'Activar cuenta',
  inicio: 'Inicio',
};

type BreadcrumbSegment = {
  label: string;
  href: string;
  isLast: boolean;
};

export function PortalBreadcrumb() {
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
    const uuidParts = pathname.split('/').filter((part) => UUID_RE.test(part));
    return uuidParts.length > 1 ? uuidParts[1] : undefined;
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
      } else if (UUID_RE.test(part)) {
        uuidsSeen += 1;
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

  // Standalone row under the header (design `AOIa5`), aligned with GritPageContainer
  // and visible on mobile, where it wraps instead of hiding (US-0116)
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-12">
      <nav aria-label="Ruta de navegación">
        <ol className="flex flex-wrap items-center gap-2 font-grit-body text-[13px] font-medium text-grit-subtext">
          {segments.map((seg, i) => (
            <li key={seg.href} className="flex min-w-0 items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="select-none">
                  ›
                </span>
              )}
              {i === 0 && <GritIcon name="home" size={13} />}
              {seg.isLast ? (
                <span className="max-w-[60vw] truncate font-bold text-grit-text" aria-current="page">
                  {seg.label}
                </span>
              ) : (
                <Link href={seg.href} className="transition-colors hover:text-grit-cyan">
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
