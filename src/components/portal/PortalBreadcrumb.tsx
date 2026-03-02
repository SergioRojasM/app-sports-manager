'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useTenantName } from '@/hooks/portal/tenant/useTenantName';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maps URL path slugs to human-readable labels. */
const SLUG_LABELS: Record<string, string> = {
  orgs: 'Orgs',
  'gestion-organizacion': 'Organización',
  'gestion-escenarios': 'Escenarios',
  'gestion-disciplinas': 'Disciplinas',
  'gestion-entrenamientos': 'Entrenamientos',
  'gestion-planes': 'Planes',
  'entrenamientos-disponibles': 'Entrenamientos Disponibles',
  atletas: 'Atletas',
  perfil: 'Perfil',
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

  const segments = useMemo((): BreadcrumbSegment[] => {
    const parts = pathname.split('/').filter(Boolean);
    const result: BreadcrumbSegment[] = [];
    let accumulated = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated += `/${part}`;
      const isLast = i === parts.length - 1;

      if (i === 0 && part === 'portal') {
        result.push({ label: 'Inicio', href: '/portal', isLast });
      } else if (UUID_RE.test(part)) {
        result.push({ label: tenantName ?? '…', href: accumulated, isLast });
      } else {
        result.push({ label: SLUG_LABELS[part] ?? part, href: accumulated, isLast });
      }
    }

    return result;
  }, [pathname, tenantName]);

  // Only render when there is more than the root "Inicio"
  if (segments.length <= 1) return null;

  return (
    <nav
      aria-label="Ruta actual"
      className="flex items-center gap-1 text-xs text-slate-500"
    >
      {segments.map((seg, i) => (
        <span key={seg.href} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden="true" className="select-none text-slate-600">
              ›
            </span>
          )}
          {seg.isLast ? (
            <span className="font-medium text-slate-300">{seg.label}</span>
          ) : (
            <Link
              href={seg.href}
              className="transition-colors hover:text-slate-300"
            >
              {seg.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
