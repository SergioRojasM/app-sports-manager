'use client';

import { useEffect, useState } from 'react';
import { organizacionesPublicasService } from '@/services/supabase/portal/organizaciones-publicas.service';
import type { OrganizacionDestacada } from '@/types/portal/organizaciones-publicas.types';

export const HOME_ORGANIZACIONES_LIMIT = 6;

/** Public organizations for the app home showcase (US-0140). */
export function useOrganizacionesDestacadas() {
  const [items, setItems] = useState<OrganizacionDestacada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    organizacionesPublicasService
      .listDestacadas(HOME_ORGANIZACIONES_LIMIT)
      .then((organizaciones) => {
        if (active) setItems(organizaciones);
      })
      .catch((loadError) => {
        console.error('useOrganizacionesDestacadas: failed to load organizations', loadError);
        if (active) {
          setItems([]);
          setError('No fue posible cargar las organizaciones.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { items, loading, error };
}
