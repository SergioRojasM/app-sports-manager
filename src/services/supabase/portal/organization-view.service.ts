import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/services/supabase/client';
import type {
  OrganizationViewData,
  OrganizationViewError,
  OrganizationViewErrorCode,
} from '@/types/portal/organization-view.types';

type TenantRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  logo_url: string | null;
  fecha_creacion: string | null;
  email: string | null;
  telefono: string | null;
  web_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
};

type CoachRow = {
  nombre: string | null;
  apellido: string | null;
  created_at: string;
  roles: { nombre: string } | { nombre: string }[] | null;
};

type LocationRow = {
  ubicacion: string | null;
  activo: boolean | null;
  created_at: string;
};

function parseRoleName(value: CoachRow['roles']): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0]?.nombre ?? null;
  }
  return value.nombre ?? null;
}

function joinPersonName(nombre: string | null, apellido: string | null): string | null {
  const fullName = [nombre ?? '', apellido ?? ''].join(' ').trim();
  return fullName.length ? fullName : null;
}

function mapCodeToMessage(code: OrganizationViewErrorCode): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'No active session was found for this view.';
    case 'PROFILE_NOT_FOUND':
      return 'Unable to resolve your organization profile.';
    case 'TENANT_NOT_FOUND':
      return 'Organization information is not available for this account.';
    case 'UNKNOWN':
    default:
      return 'Unable to load organization information right now.';
  }
}

export const organizationViewService = {
  mapError(error: unknown): OrganizationViewError {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('No active session')) {
      return { code: 'UNAUTHENTICATED', message: mapCodeToMessage('UNAUTHENTICATED') };
    }

    if (message.includes('User profile not found')) {
      return { code: 'PROFILE_NOT_FOUND', message: mapCodeToMessage('PROFILE_NOT_FOUND') };
    }

    if (message.includes('Tenant not found')) {
      return { code: 'TENANT_NOT_FOUND', message: mapCodeToMessage('TENANT_NOT_FOUND') };
    }

    return { code: 'UNKNOWN', message: mapCodeToMessage('UNKNOWN') };
  },

  async getCurrentUserTenantId(supabase: SupabaseClient, userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (error || !data?.tenant_id) {
      throw new Error('User profile not found');
    }

    return data.tenant_id;
  },

  async fetchTenantById(supabase: SupabaseClient, tenantId: string): Promise<TenantRow> {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, nombre, descripcion, logo_url, fecha_creacion, email, telefono, web_url, instagram_url, facebook_url, x_url')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      throw new Error('Tenant not found');
    }

    return data as TenantRow;
  },

  async fetchHeadCoachByTenantId(supabase: SupabaseClient, tenantId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, apellido, created_at, roles(nombre)')
      .eq('tenant_id', tenantId)
      .eq('activo', true)
      .order('created_at', { ascending: true });

    if (error || !data?.length) {
      return null;
    }

    const rows = data as CoachRow[];
    const coach = rows.find((row) => parseRoleName(row.roles) === 'entrenador');

    return coach ? joinPersonName(coach.nombre, coach.apellido) : null;
  },

  async fetchRepresentativeLocationByTenantId(
    supabase: SupabaseClient,
    tenantId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('escenarios')
      .select('ubicacion, activo, created_at')
      .eq('tenant_id', tenantId)
      .order('activo', { ascending: false })
      .order('created_at', { ascending: true });

    if (error || !data?.length) {
      return null;
    }

    const rows = data as LocationRow[];
    const firstLocation = rows.find((row) => (row.ubicacion ?? '').trim().length > 0);
    return firstLocation?.ubicacion ?? null;
  },

  async fetchOrganizationViewData(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<OrganizationViewData> {
    const tenantId = await this.getCurrentUserTenantId(supabase, userId);
    const [tenant, headCoachName, location] = await Promise.all([
      this.fetchTenantById(supabase, tenantId),
      this.fetchHeadCoachByTenantId(supabase, tenantId),
      this.fetchRepresentativeLocationByTenantId(supabase, tenantId),
    ]);

    return {
      identity: {
        tenantId: tenant.id,
        name: tenant.nombre,
        description: tenant.descripcion,
        logoUrl: tenant.logo_url,
        foundedAt: tenant.fecha_creacion,
      },
      contact: {
        email: tenant.email,
        phone: tenant.telefono,
        websiteUrl: tenant.web_url,
      },
      social: {
        instagramUrl: tenant.instagram_url,
        facebookUrl: tenant.facebook_url,
        xUrl: tenant.x_url,
      },
      context: {
        headCoachName,
        location,
      },
    };
  },

  async getOrganizationViewData(userId: string): Promise<OrganizationViewData> {
    const supabase = createClient();
    return this.fetchOrganizationViewData(supabase, userId);
  },
};
