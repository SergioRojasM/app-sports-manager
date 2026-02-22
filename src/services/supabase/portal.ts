import type { UserProfile, UserRole, PortalDisplayProfile } from '@/types/portal.types';
import { createClient } from '@/services/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

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
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, foto_url, activo, tenant_id, rol_id, roles(id, nombre)')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);

    const roleName = ((data.roles as unknown) as { id: string; nombre: string } | null)
      ?.nombre as UserRole;

    return {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      foto_url: data.foto_url,
      activo: data.activo,
      tenant_id: data.tenant_id,
      rol_id: data.rol_id,
      role: roleName,
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
    const { data, error } = await supabase
      .from('usuarios')
      .select('roles(nombre)')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);

    return (
      ((data?.roles as unknown) as { nombre: UserRole } | null)?.nombre ?? 'atleta'
    );
  },
};
