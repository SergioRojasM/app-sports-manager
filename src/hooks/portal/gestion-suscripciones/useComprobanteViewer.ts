'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { storageService } from '@/services/supabase/portal/storage.service';

type UseComprobanteViewerResult = {
  signedUrl: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useComprobanteViewer(comprobantePath: string | null): UseComprobanteViewerResult {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(comprobantePath !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!comprobantePath) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSignedUrl(null);

    const supabase = createClient();
    storageService
      .getSignedUrl(supabase, comprobantePath, 300)
      .then((url) => {
        if (!cancelled) {
          setSignedUrl(url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('No fue posible cargar el comprobante');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [comprobantePath]);

  return { signedUrl, isLoading, error };
}
