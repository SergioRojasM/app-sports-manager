'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import type { TenantIdentityPayload } from '@/types/portal/tenant.types';
import { createClient } from '@/services/supabase/client';
import { storageService } from '@/services/supabase/portal/storage.service';
import { buildOrgLogoPath, buildOrgBannerPath } from '@/types/portal/storage.types';

type TenantIdentityCardProps = {
  identity: TenantIdentityPayload;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  actionVariant?: 'access' | 'subscribe';
  customAction?: React.ReactNode;
};

function formatDate(dateValue: string | null): string {
  if (!dateValue) return '—';

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function display(value: string | null): string {
  return value && value.trim().length > 0 ? value : '—';
}

export function TenantIdentityCard({
  identity,
  actionLabel,
  actionHref,
  onActionClick,
  actionVariant = 'access',
  customAction,
}: TenantIdentityCardProps) {
  const [logoSrc, setLogoSrc] = useState(identity.logoUrl);
  const [logoFailed, setLogoFailed] = useState(false);
  const [bannerSrc, setBannerSrc] = useState(identity.bannerUrl);
  const [bannerFailed, setBannerFailed] = useState(false);

  const handleLogoError = useCallback(async () => {
    if (logoFailed) return; // Only try once
    setLogoFailed(true);

    try {
      const supabase = createClient();
      // Try common extensions
      for (const ext of ['png', 'jpg', 'webp']) {
        const path = buildOrgLogoPath(identity.tenantId, ext);
        try {
          const url = await storageService.getSignedUrl(supabase, path);
          setLogoSrc(url);
          return;
        } catch {
          // Try next extension
        }
      }
    } catch {
      // All attempts failed — fallback to shield icon
      setLogoSrc(null);
    }
  }, [identity.tenantId, logoFailed]);

  const handleBannerError = useCallback(async () => {
    if (bannerFailed) return;
    setBannerFailed(true);

    try {
      const supabase = createClient();
      for (const ext of ['png', 'jpg', 'webp']) {
        const path = buildOrgBannerPath(identity.tenantId, ext);
        try {
          const url = await storageService.getSignedUrl(supabase, path);
          setBannerSrc(url);
          return;
        } catch {
          // Try next extension
        }
      }
    } catch {
      // All attempts failed — fallback to gradient
    }
    setBannerSrc(null);
  }, [identity.tenantId, bannerFailed]);

  return (
    <article className="overflow-hidden rounded-lg border border-portal-border bg-navy-medium/95 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
      <div className="relative h-24 bg-gradient-to-r from-primary/45 to-turquoise/35">
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerSrc}
            alt={`${identity.name} banner`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => void handleBannerError()}
          />
        ) : null}
        <div className="absolute left-4 top-2">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-portal-border bg-navy-soft shadow-lg">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={`${identity.name} logo`}
                className="h-full w-full object-cover"
                onError={() => void handleLogoError()}
              />
            ) : (
              <span className="material-symbols-outlined text-2xl text-slate-400" aria-hidden="true">
                shield
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-5 pt-3">
        <div>
          <h3 className="text-[26px] leading-tight font-bold text-slate-100">{display(identity.name)}</h3>
          <span className="mt-2 inline-block rounded-full bg-turquoise/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-turquoise">
            {display(identity.description)}
          </span>
        </div>

        <dl className="space-y-2.5">
          <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
              calendar_month
            </span>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Founded</dt>
              <dd className="text-sm font-medium text-slate-200">{formatDate(identity.foundedAt)}</dd>
            </div>
          </div>

        </dl>

        {customAction ?? null}

        {actionLabel ? (
          actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex w-full items-center justify-center rounded-lg bg-turquoise px-3 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onActionClick}
              className={[
                'inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition',
                actionVariant === 'subscribe'
                  ? 'border border-portal-border bg-navy-deep text-slate-200 hover:bg-navy-soft'
                  : 'bg-turquoise text-navy-deep hover:bg-turquoise/90',
              ].join(' ')}
            >
              {actionLabel}
            </button>
          )
        ) : null}
      </div>
    </article>
  );
}
