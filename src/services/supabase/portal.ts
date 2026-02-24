import type { UserProfile, UserRole, PortalDisplayProfile } from '@/types/portal.types';
import { createClient } from '@/services/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type MembershipRow = {
  tenant_id: string;
  rol_id: string;
  roles: { nombre: string } | { nombre: string }[] | null;
  tenants:
    | { id: string; nombre: string | null }
    | { id: string; nombre: string | null }[]
    | null;
};

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getActiveMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<MembershipRow> {
  const { data, error } = await supabase
    .from('miembros_tenant')
    .select('tenant_id, rol_id, roles(nombre), tenants(id, nombre)')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Membership context not found');

  return data as unknown as MembershipRow;
}

export const portalService = {
  /**
   * Fetches the full user profile + role using the browser Supabase client.
   * Call from client hooks (e.g. useAuth) immediately after login.
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const supabase = createClient();
    return portalService.fetchFullProfile(supabase, userId);
  },

  /**
   * Fetches the full user profile + role using any Supabase client.
   * Use from Server Components / server-side code by passing the server client.
   */
  async fetchFullProfile(supabase: SupabaseClient, userId: string): Promise<UserProfile> {
    const membership = await getActiveMembership(supabase, userId);

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, foto_url, activo')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);

    const roleName = (toSingle(membership.roles)?.nombre as UserRole | undefined) ?? 'usuario';
    const tenant = toSingle(membership.tenants);

    return {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      foto_url: data.foto_url,
      activo: data.activo,
      tenant_id: membership.tenant_id,
      rol_id: membership.rol_id,
      role: roleName,
      membership: {
        tenant_id: membership.tenant_id,
        rol_id: membership.rol_id,
        tenant_nombre: tenant?.nombre ?? null,
      },
    };
  },

  /**
   * Fetches only the display fields (nombre, apellido, email, foto_url).
   * Cheaper query — use when role is already known (e.g. from cookie).
   */
  async fetchDisplayProfile(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<PortalDisplayProfile> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, apellido, email, foto_url')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);

    return {
      nombre: data.nombre ?? '',
      apellido: data.apellido ?? '',
      email: data.email ?? '',
      foto_url: data.foto_url ?? null,
    };
  },

  /**
   * Fetches only the user role from the DB.
   * Use as fallback when the role cookie is missing but profile cookie is still valid.
   */
  async fetchUserRole(supabase: SupabaseClient, userId: string): Promise<UserRole> {
    const membership = await getActiveMembership(supabase, userId);
    return (toSingle(membership.roles)?.nombre as UserRole | undefined) ?? 'usuario';
  },
};
