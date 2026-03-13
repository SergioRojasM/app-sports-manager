import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/services/supabase/client';
import type {
  TenantEditFormValues,
  TenantEditPayload,
  TenantEditResult,
  PortalTenantListItem,
  TenantAccessDecision,
  TenantMembershipWithRole,
  TenantViewData,
  TenantViewError,
  TenantViewErrorCode,
} from '@/types/portal/tenant.types';
import type { UserRole } from '@/types/portal.types';

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
  max_solicitudes: number;
  updated_at?: string | null;
};

type MembershipWithRoleRow = {
  tenant_id: string;
  rol_id: string;
  roles: { nombre: string } | { nombre: string }[] | null;
};

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeRole(value: string | null | undefined): UserRole {
  if (value === 'administrador' || value === 'entrenador' || value === 'usuario') {
    return value;
  }

  return 'usuario';
}

function toEditableString(value: string | null): string {
  return value ?? '';
}

function mapTenantToEditFormValues(tenant: TenantRow): TenantEditFormValues {
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
    max_solicitudes: String(tenant.max_solicitudes ?? 2),
  };
}

function mapCodeToMessage(code: TenantViewErrorCode): string {
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

export const tenantService = {
  mapError(error: unknown): TenantViewError {
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
      .from('miembros_tenant')
      .select('tenant_id')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data?.tenant_id) {
      throw new Error('User profile not found');
    }

    return data.tenant_id;
  },

  async fetchTenantById(supabase: SupabaseClient, tenantId: string): Promise<TenantRow> {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, nombre, descripcion, logo_url, fecha_creacion, email, telefono, web_url, instagram_url, facebook_url, x_url, max_solicitudes')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      throw new Error('Tenant not found');
    }

    return data as TenantRow;
  },

  async fetchTenantEditData(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string,
  ): Promise<TenantEditFormValues> {
    const access = await this.canUserAccessTenant(supabase, userId, tenantId);
    if (!access.allowed) {
      throw new Error('User profile not found');
    }

    const tenant = await this.fetchTenantById(supabase, tenantId);
    return mapTenantToEditFormValues(tenant);
  },

  async updateTenant(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string,
    payload: TenantEditPayload,
  ): Promise<TenantEditResult> {
    const access = await this.canUserAccessTenant(supabase, userId, tenantId);
    if (!access.allowed) {
      throw new Error('User profile not found');
    }

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

  async fetchTenantViewData(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string,
  ): Promise<TenantViewData> {
    const access = await this.canUserAccessTenant(supabase, userId, tenantId);
    if (!access.allowed) {
      throw new Error('User profile not found');
    }

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

  async getTenantViewData(userId: string): Promise<TenantViewData> {
    const supabase = createClient();
    const tenantId = await this.getCurrentUserTenantId(supabase, userId);
    return this.fetchTenantViewData(supabase, userId, tenantId);
  },

  async getTenantMaxSolicitudes(tenantId: string): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('max_solicitudes')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      return 2;
    }

    return (data as { max_solicitudes: number }).max_solicitudes ?? 2;
  },

  async listVisibleTenantsForPortal(supabase: SupabaseClient): Promise<TenantRow[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select(
        'id, nombre, descripcion, logo_url, fecha_creacion, email, telefono, web_url, instagram_url, facebook_url, x_url, max_solicitudes',
      )
      .neq('nombre', 'public')
      .order('fecha_creacion', { ascending: true });

    if (error) {
      throw new Error('Tenant list not found');
    }

    return (data ?? []) as TenantRow[];
  },

  async listUserTenantMemberships(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<TenantMembershipWithRole[]> {
    const { data, error } = await supabase
      .from('miembros_tenant')
      .select('tenant_id, rol_id, roles(nombre)')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error('Membership context not found');
    }

    return ((data ?? []) as MembershipWithRoleRow[]).map((membership) => ({
      tenantId: membership.tenant_id,
      roleId: membership.rol_id,
      role: normalizeRole(toSingle(membership.roles)?.nombre),
    }));
  },

  async canUserAccessTenant(
    supabase: SupabaseClient,
    userId: string,
    tenantId: string,
  ): Promise<TenantAccessDecision> {
    const { data, error } = await supabase
      .from('miembros_tenant')
      .select('tenant_id, rol_id, roles(nombre)')
      .eq('usuario_id', userId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return {
        tenantId,
        allowed: false,
        role: null,
      };
    }

    const row = data as MembershipWithRoleRow;

    return {
      tenantId,
      allowed: true,
      role: normalizeRole(toSingle(row.roles)?.nombre),
    };
  },

  mapPortalTenants(
    tenants: TenantRow[],
    memberships: TenantMembershipWithRole[],
  ): PortalTenantListItem[] {
    const membershipByTenant = new Map(memberships.map((membership) => [membership.tenantId, membership]));

    return tenants.map((tenant) => {
      const membership = membershipByTenant.get(tenant.id);
      return {
        identity: {
          tenantId: tenant.id,
          name: tenant.nombre,
          description: tenant.descripcion,
          logoUrl: tenant.logo_url,
          foundedAt: tenant.fecha_creacion,
        },
        canAccess: Boolean(membership),
        userMembershipRole: membership?.role ?? null,
      };
    });
  },
};
