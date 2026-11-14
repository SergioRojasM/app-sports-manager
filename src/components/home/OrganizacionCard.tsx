'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { GritIcon, cx } from '@/components/ui';
import { useTenantBrandingImages } from '@/hooks/portal/tenant/useTenantBrandingImages';
import { formatAtletas, getIniciales } from '@/lib/home/home.utils';
import type { OrganizacionDestacada } from '@/types/portal/organizaciones-publicas.types';

type OrganizacionCardProps = {
  organizacion: OrganizacionDestacada;
  /** Signed-in users can open the marketplace; anonymous visitors only see the card. */
  isAuthenticated: boolean;
  className?: string;
};

const DESCRIPCION_DEFAULT = 'Organización deportiva en GRIT Arena.';

function CardShell({ href, className, children }: { href: string | null; className: string; children: ReactNode }) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <article className={className}>{children}</article>;
}

export function OrganizacionCard({ organizacion, isAuthenticated, className }: OrganizacionCardProps) {
  // Shared fallback (tenant-marketplace-visibility): a failing stored URL is retried once with a
  // fresh signed URL — anonymous visitors cannot sign, so they end on the initials/gradient.
  const { logoSrc, bannerSrc, onLogoError, onBannerError } = useTenantBrandingImages({
    tenantId: organizacion.id,
    name: organizacion.nombre,
    description: organizacion.descripcion,
    logoUrl: organizacion.logoUrl,
    bannerUrl: organizacion.bannerUrl,
    foundedAt: null,
  });
  const atletas = formatAtletas(organizacion.totalAtletas);

  return (
    <CardShell
      href={isAuthenticated ? '/portal/orgs' : null}
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-grit-2xl border border-grit-glass-border bg-grit-card backdrop-blur transition duration-300',
        isAuthenticated && 'hover:-translate-y-1 hover:border-grit-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan',
        className,
      )}
    >
      <div className="relative h-[110px] w-full overflow-hidden">
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt="" loading="lazy" onError={onBannerError} className="h-full w-full object-cover opacity-85" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#16283A] to-grit-teal/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B182633] to-[#0B1826]" />
      </div>

      {/* Logo overlaps the banner */}
      <div className="absolute left-[22px] top-[70px] h-[76px] w-[76px] overflow-hidden rounded-[20px] border-4 border-[#0B1826] shadow-[0_6px_20px_rgba(0,0,0,0.4)]">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={`Logo de ${organizacion.nombre}`}
            loading="lazy"
            onError={onLogoError}
            className="h-full w-full bg-grit-bg object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label={`Logo de ${organizacion.nombre}`}
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-grit-cyan to-grit-teal"
          >
            <span className="font-grit-title text-[28px] font-bold italic text-grit-bg">{getIniciales(organizacion.nombre)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-[22px] pb-[22px]">
        <div className="flex min-h-[62px] items-start pl-[92px] pt-3.5">
          <h3 className="line-clamp-2 font-grit-title text-[22px] font-bold leading-tight text-grit-text">{organizacion.nombre}</h3>
        </div>

        <p className="line-clamp-2 min-h-[42px] font-grit-body text-sm leading-[1.55] text-grit-subtext">
          {organizacion.descripcion?.trim() || DESCRIPCION_DEFAULT}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex min-w-0 gap-1.5">
            {organizacion.disciplinas.slice(0, 2).map((disciplina) => (
              <span key={disciplina} className="truncate rounded-grit-sm bg-grit-cyan/10 px-2.5 py-1 font-grit-body text-xs font-semibold text-grit-cyan">
                {disciplina}
              </span>
            ))}
          </div>
          {atletas && (
            <span className="flex shrink-0 items-center gap-1.5 font-grit-body text-[13px] font-semibold text-grit-subtext">
              <GritIcon name="group" size={16} className="text-grit-muted" />
              {atletas}
            </span>
          )}
        </div>
      </div>
    </CardShell>
  );
}
