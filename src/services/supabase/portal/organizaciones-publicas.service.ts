import { createClient } from '@/services/supabase/client';
import type {
  OrganizacionDestacada,
  OrganizacionDestacadaRow,
} from '@/types/portal/organizaciones-publicas.types';

function toOrganizacionDestacada(row: OrganizacionDestacadaRow): OrganizacionDestacada {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    disciplinas: row.disciplinas ?? [],
    totalAtletas: row.total_atletas ?? 0,
  };
}

export const organizacionesPublicasService = {
  /**
   * Public organizations for the app home (US-0140). Works for anonymous visitors through the
   * SECURITY DEFINER RPC `listar_organizaciones_destacadas`; `tenants` itself stays authenticated-only.
   */
  async listDestacadas(limit = 6): Promise<OrganizacionDestacada[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('listar_organizaciones_destacadas', { p_limit: limit });

    if (error) {
      console.error('organizacionesPublicasService.listDestacadas: RPC failed', error);
      throw new Error('No fue posible cargar las organizaciones.');
    }

    return ((data ?? []) as OrganizacionDestacadaRow[]).map(toOrganizacionDestacada);
  },
};
