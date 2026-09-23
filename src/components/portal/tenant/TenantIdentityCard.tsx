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
  /** Rendered under the primary action / customAction (e.g. "Ver planes" — US-0093). */
  secondaryAction?: React.ReactNode;
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
  secondaryAction,
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
    <article className="overflow-hidden rounded-grit-md border border-grit-glass-border bg-grit-card shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
      <div className="relative h-24 bg-gradient-to-r from-grit-cyan/45 to-grit-cyan/35">
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
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-grit-glass-border bg-grit-card shadow-lg">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={`${identity.name} logo`}
                className="h-full w-full object-cover"
                onError={() => void handleLogoError()}
              />
            ) : (
              <span className="material-symbols-outlined text-2xl text-grit-subtext" aria-hidden="true">
                shield
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-5 pt-3">
        <div>
          <h3 className="font-grit-title text-[26px] leading-tight font-bold text-grit-text">{display(identity.name)}</h3>
          <span className="mt-2 inline-block rounded-full bg-grit-cyan/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-grit-cyan">
            {display(identity.description)}
          </span>
        </div>

        <dl className="space-y-2.5">
          <div className="flex items-center gap-3 rounded-grit-md bg-grit-bg/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-grit-cyan/20 p-2 text-[18px] text-grit-cyan" aria-hidden="true">
              calendar_month
            </span>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-grit-muted">Founded</dt>
              <dd className="text-sm font-medium text-grit-text">{formatDate(identity.foundedAt)}</dd>
            </div>
          </div>

        </dl>

        {customAction ?? null}

        {actionLabel ? (
          actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex w-full items-center justify-center rounded-grit-md bg-grit-cyan px-3 py-2 text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan/90"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onActionClick}
              className={[
                'inline-flex w-full items-center justify-center rounded-grit-md px-3 py-2 text-sm font-semibold transition',
                actionVariant === 'subscribe'
                  ? 'border border-grit-glass-border bg-grit-bg text-grit-text hover:bg-grit-cyan/10'
                  : 'bg-grit-cyan text-grit-bg hover:bg-grit-cyan/90',
              ].join(' ')}
            >
              {actionLabel}
            </button>
          )
        ) : null}

        {secondaryAction ?? null}
      </div>
    </article>
  );
}
