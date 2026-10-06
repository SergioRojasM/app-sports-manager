'use client';

import type { ReactNode } from 'react';
import { GritIcon, cx } from '@/components/ui';
import { useTenantBrandingImages } from '@/hooks/portal/tenant/useTenantBrandingImages';
import type { TenantIdentityPayload } from '@/types/portal/tenant.types';

type TenantDirectoryCardProps = {
  identity: TenantIdentityPayload;
  isMember: boolean;
  isPublic: boolean;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
};

function formatFundacion(dateValue: string | null): string | null {
  if (!dateValue) return null;

  // `fecha_creacion` is a plain date: parse it as local so the month never shifts
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T00:00:00` : dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(parsed);
}

/** Organization card of "Organizaciones disponibles" (US-0133), adapted from the event discovery card. */
export function TenantDirectoryCard({
  identity,
  isMember,
  isPublic,
  primaryAction,
  secondaryAction,
}: TenantDirectoryCardProps) {
  const { logoSrc, bannerSrc, onLogoError, onBannerError } = useTenantBrandingImages(identity);
  const descripcion = identity.description?.trim();
  const fundacion = formatFundacion(identity.foundedAt);

  return (
    <article
      className={cx(
        'flex flex-col overflow-hidden rounded-grit-2xl border transition',
        isMember ? 'border-grit-cyan/60 shadow-[0_0_32px_rgba(20,219,196,0.15)]' : 'border-grit-glass-border',
      )}
    >
      <div className="relative h-44 w-full overflow-hidden">
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerSrc}
            alt={`Banner de ${identity.name}`}
            loading="lazy"
            onError={onBannerError}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-grit-card to-grit-bg">
            <GritIcon name="shield" size={48} className="text-grit-cyan opacity-60" />
          </div>
        )}

        {(isMember || !isPublic) && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {isMember && (
              <span className="flex items-center gap-1 rounded-grit-sm border border-grit-cyan/50 bg-grit-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-grit-cyan">
                <GritIcon name="verified" size={12} />
                Miembro
              </span>
            )}
            {!isPublic && (
              <span className="flex items-center gap-1 rounded-grit-sm border border-grit-glass-border bg-grit-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-grit-text">
                <GritIcon name="lock" size={12} />
                Privada
              </span>
            )}
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-grit-glass-border bg-grit-bg/80">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={`Logo de ${identity.name}`}
              loading="lazy"
              onError={onLogoError}
              className="h-full w-full object-cover"
            />
          ) : (
            <GritIcon name="shield" size={22} className="text-grit-subtext" />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 bg-grit-card p-3.5 backdrop-blur">
        <h3 className="break-words font-grit-title text-lg font-bold italic text-grit-text">{identity.name}</h3>

        {descripcion && (
          <p className="line-clamp-2 whitespace-pre-wrap font-grit-body text-sm text-grit-subtext">{descripcion}</p>
        )}

        {fundacion && (
          <p className="flex items-center gap-1 font-grit-body text-[11px] text-grit-subtext">
            <GritIcon name="calendar_month" size={13} className="text-grit-cyan" />
            Desde {fundacion}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          {primaryAction}
          {secondaryAction ?? null}
        </div>
      </div>
    </article>
  );
}
