'use client';

import Link from 'next/link';
import { GritIcon, cx } from '@/components/ui';
import { useOrganizacionesDestacadas } from '@/hooks/home/useOrganizacionesDestacadas';
import { OrganizacionCard } from './OrganizacionCard';

type OrganizacionesSectionProps = {
  isAuthenticated: boolean;
};

const MARKETPLACE_PATH = '/portal/orgs';

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cx('h-[300px] animate-pulse rounded-grit-2xl border border-grit-glass-border bg-grit-card', className)}>
      <div className="h-[110px] rounded-t-grit-2xl bg-[#16283A]" />
    </div>
  );
}

export function OrganizacionesSection({ isAuthenticated }: OrganizacionesSectionProps) {
  const { items, loading } = useOrganizacionesDestacadas();

  // No organizations (or an error, already logged by the hook): the section is not shown
  if (!loading && items.length === 0) return null;

  const verTodasHref = isAuthenticated
    ? MARKETPLACE_PATH
    : `/auth/login?next=${encodeURIComponent(MARKETPLACE_PATH)}`;

  return (
    <section
      id="organizaciones"
      aria-labelledby="home-organizaciones-title"
      className="relative flex scroll-mt-20 flex-col items-center gap-7 border-t border-grit-cyan/20 bg-[#0A1626] bg-[radial-gradient(ellipse_at_top,rgba(20,219,196,0.12),transparent_60%)] py-16 md:gap-[52px] md:px-20 md:pb-[120px] md:pt-[110px]"
    >
      <div className="flex max-w-[900px] flex-col items-center gap-2.5 px-5 text-center md:gap-3.5">
        <span className="flex items-center gap-2.5">
          <span className="hidden h-0.5 w-7 bg-grit-cyan md:block" />
          <span className="font-grit-title text-xs font-bold uppercase tracking-[0.25em] text-grit-cyan-light md:text-sm">
            Organizaciones
          </span>
          <span className="hidden h-0.5 w-7 bg-grit-cyan md:block" />
        </span>
        <h2 id="home-organizaciones-title" className="font-grit-title text-[34px] font-bold italic leading-none text-grit-text md:text-[52px]">
          Clubes que entrenan con GRIT Arena
        </h2>
        <p className="font-grit-body text-[15px] leading-relaxed text-grit-subtext md:text-base">
          Encuentra tu club, reserva entrenamientos y sigue tu progreso con tu equipo.
        </p>
      </div>

      {loading ? (
        <div className="flex w-full max-w-[1280px] gap-6 overflow-hidden px-5 md:grid md:grid-cols-2 md:px-0 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonCard key={index} className={cx('w-[310px] shrink-0 md:w-auto', index >= 2 && 'hidden md:block')} />
          ))}
        </div>
      ) : (
        <div
          className={cx(
            'flex w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] md:grid md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden',
            // Fewer than 3 organizations: narrower grid so the cards stay centered
            items.length === 1 && 'md:max-w-[410px] md:grid-cols-1',
            items.length === 2 && 'md:max-w-[844px] md:grid-cols-2',
            items.length >= 3 && 'max-w-[1280px] md:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {items.map((organizacion) => (
            <OrganizacionCard
              key={organizacion.id}
              organizacion={organizacion}
              isAuthenticated={isAuthenticated}
              className="w-[310px] shrink-0 snap-start md:w-auto"
            />
          ))}
        </div>
      )}

      <div className="flex w-full flex-col items-center gap-3 px-5 md:w-auto md:px-0">
        <Link
          href={verTodasHref}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-grit-lg bg-grit-cyan px-7 py-4 font-grit-title text-lg font-bold text-grit-bg shadow-[0_8px_32px_rgba(20,219,196,0.27)] transition hover:bg-grit-cyan-light md:w-auto md:text-xl"
        >
          Ver todas las organizaciones
          <GritIcon name="arrow_forward" size={20} />
        </Link>
        {!isAuthenticated && (
          <p className="flex items-center gap-2 text-center font-grit-body text-[13px] text-grit-muted">
            <GritIcon name="lock" size={14} />
            Inicia sesión para ver todas las organizaciones y unirte a la tuya.
          </p>
        )}
      </div>
    </section>
  );
}
