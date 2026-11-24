'use client';

import { GritAvatar, GritMediaCard } from '@/components/ui';
import { VerPlanesButton } from '@/components/portal/planes-publicos';
import { useTenantBrandingImages } from '@/hooks/portal/tenant/useTenantBrandingImages';
import type { PortalTenantListItem } from '@/types/portal/tenant.types';
import { firstDescriptionLine } from './club-card.utils';
import { SolicitarAccesoButton } from './SolicitarAccesoButton';

type ClubExploreCardProps = {
  organization: PortalTenantListItem;
};

/** "Explora clubes" card of the organization marketplace (grit-arena-v3 `UrDey`, 268×342). */
export function ClubExploreCard({ organization }: ClubExploreCardProps) {
  const { identity } = organization;
  const { logoSrc, bannerSrc, onLogoError, onBannerError } = useTenantBrandingImages(identity);
  const descripcion = firstDescriptionLine(identity.description);

  return (
    <GritMediaCard
      as="article"
      image={bannerSrc}
      onImageError={onBannerError}
      placeholderIcon="shield"
      radius="lg"
      padding={14}
      className="min-h-[342px]"
      bottom={
        <>
          <div className="flex min-w-0 items-center gap-2.5">
            <GritAvatar name={identity.name} src={logoSrc} onImageError={onLogoError} tone="org" size={36} />
            <div className="flex min-w-0 flex-col gap-[3px]">
              <h3 className="truncate font-grit-body text-[15px] font-semibold text-grit-text">{identity.name}</h3>
              {descripcion ? <p className="truncate font-grit-body text-[11px] text-grit-subtext">{descripcion}</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <VerPlanesButton tenantId={identity.tenantId} tenantNombre={identity.name} appearance="overlay" fullWidth />
            <SolicitarAccesoButton tenantId={identity.tenantId} size="sm" />
          </div>
        </>
      }
    />
  );
}
