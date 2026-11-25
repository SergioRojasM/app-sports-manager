'use client';

import { GritAvatar, GritCard, GritIcon, GritMediaCard, GritTag } from '@/components/ui';
import { useTenantBrandingImages } from '@/hooks/portal/tenant/useTenantBrandingImages';
import type { TenantIdentityPayload } from '@/types/portal/tenant.types';

type TenantIdentityCardProps = {
  identity: TenantIdentityPayload;
  /** `tenants.publico`; undefined hides the tag. */
  isPublic?: boolean;
  /** Number of members; null shows "—". */
  miembros: number | null;
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "Mar 2026" in Bogotá time, or "—". */
export function formatFundada(dateValue: string | null): string {
  if (!dateValue) return '—';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: 'numeric' }).formatToParts(parsed);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${MONTHS[month - 1]} ${year}`;
}

function MetaTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 font-grit-body text-[9px] font-semibold uppercase tracking-[1.2px] text-grit-muted">
        <GritIcon name={icon} size={12} className="text-grit-cyan" />
        {label}
      </dt>
      <dd className="truncate font-grit-body text-[13px] font-semibold text-grit-text">{value}</dd>
    </div>
  );
}

/** Organization identity card (`aYwNn` `MhFv0`): banner cover, logo, name, visibility tag and meta tiles. */
export function TenantIdentityCard({ identity, isPublic, miembros }: TenantIdentityCardProps) {
  const { logoSrc, bannerSrc, onLogoError, onBannerError } = useTenantBrandingImages(identity);

  return (
    <GritCard variant="card" padding="none" className="flex flex-col overflow-hidden" as="article">
      <GritMediaCard
        image={bannerSrc}
        onImageError={onBannerError}
        placeholderIcon="panorama"
        radius="none"
        stroke="none"
        className="h-[104px] shrink-0"
      />
      <div className="flex flex-1 flex-col gap-3.5 px-[22px] pb-5">
        <div className="flex items-end gap-3.5">
          <GritAvatar
            name={identity.name}
            src={logoSrc}
            onImageError={onLogoError}
            tone="org"
            shape="rounded"
            size={56}
            className="-mt-7 shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
          />
          <div className="flex min-w-0 flex-col gap-1.5 pt-2">
            <h2 className="truncate font-grit-title text-2xl font-medium leading-tight text-grit-text">{identity.name}</h2>
            {isPublic !== undefined && (
              <GritTag tone={isPublic ? 'accent' : 'neutral'} icon={isPublic ? 'language' : 'lock'} className="self-start">
                {isPublic ? 'Pública' : 'Privada'}
              </GritTag>
            )}
          </div>
        </div>
        {identity.description ? (
          <p className="line-clamp-2 font-grit-body text-xs text-grit-subtext">{identity.description}</p>
        ) : null}
        <dl className="mt-auto flex gap-2.5">
          <MetaTile icon="calendar_today" label="Fundada" value={formatFundada(identity.foundedAt)} />
          <MetaTile icon="group" label="Miembros" value={miembros === null ? '—' : String(miembros)} />
        </dl>
      </div>
    </GritCard>
  );
}
