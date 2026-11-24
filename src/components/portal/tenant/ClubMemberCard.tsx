'use client';

import { GritAvatar, GritButton, GritMediaCard, GritOverlayPill } from '@/components/ui';
import { VerPlanesButton } from '@/components/portal/planes-publicos';
import { useTenantBrandingImages } from '@/hooks/portal/tenant/useTenantBrandingImages';
import { getDefaultTenantPath } from '@/lib/portal/tenant-paths';
import type { PortalTenantListItem } from '@/types/portal/tenant.types';
import { firstDescriptionLine } from './club-card.utils';

type ClubMemberCardProps = {
  organization: PortalTenantListItem;
};

/** "Tus clubes" card of the organization marketplace (grit-arena-v3 `K1KpU`, 552×300). */
export function ClubMemberCard({ organization }: ClubMemberCardProps) {
  const { identity, isPublic, userMembershipRole } = organization;
  const { logoSrc, bannerSrc, onLogoError, onBannerError } = useTenantBrandingImages(identity);
  const ingresarHref = getDefaultTenantPath(identity.tenantId, userMembershipRole ?? 'usuario');
  const descripcion = firstDescriptionLine(identity.description);

  return (
    <GritMediaCard
      as="article"
      image={bannerSrc}
      onImageError={onBannerError}
      placeholderIcon="shield"
      radius="xl"
      stroke="accent"
      padding={20}
      className="min-h-[300px]"
      top={
        <>
          <div className="flex flex-wrap gap-2">
            <GritOverlayPill icon="check_circle">MIEMBRO</GritOverlayPill>
            {!isPublic ? <GritOverlayPill icon="lock">PRIVADA</GritOverlayPill> : null}
          </div>
          <GritOverlayPill
            href={ingresarHref}
            ariaLabel={`Ingresar a ${identity.name}`}
            iconTone="ink"
            icon="arrow_outward"
            className="h-[38px] w-[38px] justify-center !px-0"
          >
            {null}
          </GritOverlayPill>
        </>
      }
      bottom={
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <GritAvatar name={identity.name} src={logoSrc} onImageError={onLogoError} tone="org" size={52} />
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="truncate font-grit-title text-[28px] font-medium italic leading-none text-grit-text">{identity.name}</h3>
              {descripcion ? <p className="truncate font-grit-body text-xs text-grit-subtext">{descripcion}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <VerPlanesButton tenantId={identity.tenantId} tenantNombre={identity.name} appearance="overlay" />
            <GritButton href={ingresarHref} icon="arrow_forward" iconPosition="end">
              Ingresar
            </GritButton>
          </div>
        </div>
      }
    />
  );
}
