'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { organizationViewService } from '@/services/supabase/portal/organization-view.service';
import type {
  OrganizationViewData,
  OrganizationViewState,
} from '@/types/portal/organization-view.types';

type UseOrganizationViewResult = OrganizationViewState & {
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useOrganizationView(): UseOrganizationViewResult {
  const [data, setData] = useState<OrganizationViewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const mapped = organizationViewService.mapError(new Error('No active session'));
      setData(null);
      setError(mapped.message);
      setLoading(false);
      return;
    }

    try {
      const payload = await organizationViewService.fetchOrganizationViewData(supabase, user.id);
      setData(payload);
    } catch (unknownError) {
      const mapped = organizationViewService.mapError(unknownError);
      setData(null);
      setError(mapped.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await load();
    };

    execute();

    return () => {
      mounted = false;
    };
  }, [load]);

  return {
    data,
    loading,
    error,
    retry: load,
    refresh: load,
  };
}
