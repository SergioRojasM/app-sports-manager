'use client';

import { useCallback, useEffect, useState } from 'react';
import { invitacionesService } from '@/services/supabase/portal/invitaciones.service';
import type { MiInvitacionPendiente } from '@/types/portal/invitaciones.types';

type UseMisInvitacionesResult = {
  invitaciones: MiInvitacionPendiente[];
  loading: boolean;
  refresh: () => Promise<void>;
};

/** Pending invitations for the signed-in user. Errors resolve to an empty list: the section is optional. */
export function useMisInvitaciones(): UseMisInvitacionesResult {
  const [invitaciones, setInvitaciones] = useState<MiInvitacionPendiente[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setInvitaciones(await invitacionesService.getMisInvitacionesPendientes());
    } catch {
      setInvitaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { invitaciones, loading, refresh: loadData };
}
