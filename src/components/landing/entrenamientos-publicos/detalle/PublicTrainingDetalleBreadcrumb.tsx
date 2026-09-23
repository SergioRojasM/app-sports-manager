'use client';

import Link from 'next/link';
import { GritIcon } from '@/components/ui';

type PublicTrainingDetalleBreadcrumbProps = {
  /** Already-resolved origin (see resolveOrigin in PublicTrainingDetallePage). */
  origin: string;
  /** Last crumb; omitted while the training is loading / missing. */
  nombre?: string;
};

/**
 * Breadcrumb row matching design node `AOIa5`, with the existing "Volver" link
 * kept right-aligned in the same row (US-0116). Both hrefs come from the
 * caller's `origin`, so navigation is identical to US-0109.
 */
export function PublicTrainingDetalleBreadcrumb({ origin, nombre }: PublicTrainingDetalleBreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Ruta de navegación" className="min-w-0">
        <ol className="flex flex-wrap items-center gap-2 font-grit-body text-[13px] font-medium text-grit-subtext">
          <li>
            <Link href="/" className="inline-flex items-center gap-2 transition hover:text-grit-cyan">
              <GritIcon name="home" size={13} />
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={origin} className="transition hover:text-grit-cyan">
              Entrenamientos
            </Link>
          </li>
          {nombre && (
            <>
              <li aria-hidden="true">›</li>
              <li className="max-w-[60vw] truncate font-bold text-grit-text" aria-current="page">
                {nombre}
              </li>
            </>
          )}
        </ol>
      </nav>

      <Link
        href={origin}
        className="inline-flex items-center gap-1 font-grit-body text-[13px] font-semibold text-grit-subtext transition hover:text-grit-cyan"
      >
        <GritIcon name="arrow_back" size={15} />
        Volver
      </Link>
    </div>
  );
}
