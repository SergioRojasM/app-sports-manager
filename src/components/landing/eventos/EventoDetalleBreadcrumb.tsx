'use client';

import Link from 'next/link';
import { GritIcon } from '@/components/ui';

type EventoDetalleBreadcrumbProps = {
  /** Already-resolved origin (see resolveEventosOrigin). */
  origin: string;
  /** Last crumb; omitted while the event is loading / missing. */
  nombre?: string;
};

/** "Inicio › Eventos › {nombre}" plus a right-aligned "Volver", both pointing at `origin` (US-0120). */
export function EventoDetalleBreadcrumb({ origin, nombre }: EventoDetalleBreadcrumbProps) {
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
              Eventos
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
