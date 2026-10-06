'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { storageService } from '@/services/supabase/portal/storage.service';
import { buildOrgBannerPath, buildOrgLogoPath } from '@/types/portal/storage.types';
import type { TenantIdentityPayload } from '@/types/portal/tenant.types';

const EXTENSIONS = ['png', 'jpg', 'webp'];

type UseTenantBrandingImagesResult = {
  logoSrc: string | null;
  bannerSrc: string | null;
  onLogoError: () => void;
  onBannerError: () => void;
};

async function resolveSignedUrl(buildPath: (ext: string) => string): Promise<string | null> {
  try {
    const supabase = createClient();
    for (const ext of EXTENSIONS) {
      try {
        return await storageService.getSignedUrl(supabase, buildPath(ext));
      } catch {
        // Try next extension
      }
    }
  } catch {
    // All attempts failed — the caller falls back to its placeholder
  }
  return null;
}

/**
 * Logo and banner sources of an organization card. When a stored URL fails to load, it is
 * replaced once by a fresh signed URL of the org asset, or by `null` when none exists.
 */
export function useTenantBrandingImages(identity: TenantIdentityPayload): UseTenantBrandingImagesResult {
  const [logoSrc, setLogoSrc] = useState(identity.logoUrl);
  const [logoFailed, setLogoFailed] = useState(false);
  const [bannerSrc, setBannerSrc] = useState(identity.bannerUrl);
  const [bannerFailed, setBannerFailed] = useState(false);

  const handleLogoError = useCallback(async () => {
    if (logoFailed) {
      setLogoSrc(null);
      return;
    }
    setLogoFailed(true);
    setLogoSrc(await resolveSignedUrl((ext) => buildOrgLogoPath(identity.tenantId, ext)));
  }, [identity.tenantId, logoFailed]);

  const handleBannerError = useCallback(async () => {
    if (bannerFailed) {
      setBannerSrc(null);
      return;
    }
    setBannerFailed(true);
    setBannerSrc(await resolveSignedUrl((ext) => buildOrgBannerPath(identity.tenantId, ext)));
  }, [identity.tenantId, bannerFailed]);

  return {
    logoSrc,
    bannerSrc,
    onLogoError: () => void handleLogoError(),
    onBannerError: () => void handleBannerError(),
  };
}
