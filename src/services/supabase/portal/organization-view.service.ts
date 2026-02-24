import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/services/supabase/client';
import type {
  OrganizationEditFormValues,
  OrganizationEditPayload,
  OrganizationEditResult,
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
  updated_at?: string | null;
};

function toEditableString(value: string | null): string {
  return value ?? '';
}

function mapTenantToEditFormValues(tenant: TenantRow): OrganizationEditFormValues {
  return {
    nombre: toEditableString(tenant.nombre),
    descripcion: toEditableString(tenant.descripcion),
    logo_url: toEditableString(tenant.logo_url),
    email: toEditableString(tenant.email),
    telefono: toEditableString(tenant.telefono),
    web_url: toEditableString(tenant.web_url),
    instagram_url: toEditableString(tenant.instagram_url),
    facebook_url: toEditableString(tenant.facebook_url),
    x_url: toEditableString(tenant.x_url),
  };
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

  async fetchOrganizationEditData(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<OrganizationEditFormValues> {
    const tenantId = await this.getCurrentUserTenantId(supabase, userId);
    const tenant = await this.fetchTenantById(supabase, tenantId);
    return mapTenantToEditFormValues(tenant);
  },

  async updateOrganizationTenant(
    supabase: SupabaseClient,
    userId: string,
    payload: OrganizationEditPayload,
  ): Promise<OrganizationEditResult> {
    const tenantId = await this.getCurrentUserTenantId(supabase, userId);
    const { data, error } = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .select('updated_at')
      .single();

    if (error) {
      throw new Error('Tenant update failed');
    }

    return {
      updatedAt: data?.updated_at ?? new Date().toISOString(),
    };
  },

  async fetchOrganizationViewData(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<OrganizationViewData> {
    const tenantId = await this.getCurrentUserTenantId(supabase, userId);
    const tenant = await this.fetchTenantById(supabase, tenantId);

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
    };
  },

  async getOrganizationViewData(userId: string): Promise<OrganizationViewData> {
    const supabase = createClient();
    return this.fetchOrganizationViewData(supabase, userId);
  },
};
