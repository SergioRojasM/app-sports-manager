import { createClient } from '@/services/supabase/client';
import {
  SolicitudesServiceError,
  type AceptarSolicitudInput,
  type BloquearUsuarioInput,
  type BloqueadoRow,
  type CreateSolicitudInput,
  type RechazarSolicitudInput,
  type SolicitudEstado,
  type SolicitudRow,
} from '@/types/portal/solicitudes.types';

/* ────────── Raw row shape returned by Supabase ────────── */

type RawSolicitudRow = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  estado: string;
  mensaje: string | null;
  nota_revision: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
  created_at: string;
  usuarios: {
    nombre: string | null;
    apellido: string | null;
    email: string;
    foto_url: string | null;
  };
};

/* ────────── Mapper ────────── */

function mapRawRow(row: RawSolicitudRow): SolicitudRow {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    usuario_id: row.usuario_id,
    estado: row.estado as SolicitudEstado,
    mensaje: row.mensaje,
    nota_revision: row.nota_revision,
    revisado_por: row.revisado_por,
    revisado_at: row.revisado_at,
    created_at: row.created_at,
    nombre: row.usuarios.nombre ?? '',
    apellido: row.usuarios.apellido ?? '',
    email: row.usuarios.email,
    foto_url: row.usuarios.foto_url ?? null,
  };
}

/* ────────── Select columns ────────── */

const SOLICITUD_SELECT =
  'id, tenant_id, usuario_id, estado, mensaje, nota_revision, revisado_por, revisado_at, created_at, usuarios!usuario_id(nombre, apellido, email, foto_url)';

const BLOQUEADO_SELECT =
  'id, tenant_id, usuario_id, bloqueado_por, bloqueado_at, motivo, created_at, usuarios!usuario_id(nombre, apellido, email, foto_url)';

/* ─── Raw row shape for bloqueados ─── */

type RawBloqueadoRow = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  bloqueado_por: string | null;
  bloqueado_at: string;
  motivo: string | null;
  created_at: string;
  usuarios: {
    nombre: string | null;
    apellido: string | null;
    email: string;
    foto_url: string | null;
  };
};

function mapBloqueadoRow(row: RawBloqueadoRow): BloqueadoRow {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    usuario_id: row.usuario_id,
    bloqueado_por: row.bloqueado_por,
    bloqueado_at: row.bloqueado_at,
    motivo: row.motivo,
    created_at: row.created_at,
    nombre: row.usuarios.nombre ?? '',
    apellido: row.usuarios.apellido ?? '',
    email: row.usuarios.email,
    foto_url: row.usuarios.foto_url ?? null,
  };
}

/* ────────── Service object ────────── */

export const solicitudesService = {
  /**
   * Create a new access request.
   * Guards: (1) duplicate pending → 'duplicate', (2) ≥3 rejections → 'max_rejections'.
   */
  async createSolicitud(input: CreateSolicitudInput): Promise<void> {
    const supabase = createClient();

    // Guard 1: check for existing pendiente row
    const { data: pending, error: pendingError } = await supabase
      .from('miembros_tenant_solicitudes')
      .select('id')
      .eq('tenant_id', input.tenant_id)
      .eq('usuario_id', input.usuario_id)
      .eq('estado', 'pendiente')
      .limit(1)
      .maybeSingle();

    if (pendingError) {
      throw new SolicitudesServiceError('unknown', 'Error al verificar solicitudes pendientes.');
    }

    if (pending) {
      throw new SolicitudesServiceError('duplicate', 'Ya existe una solicitud pendiente para esta organización.');
    }

    // Guard 2: check if user is blocked
    const { count: blockedCount, error: blockedError } = await supabase
      .from('miembros_tenant_bloqueados')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', input.tenant_id)
      .eq('usuario_id', input.usuario_id);

    if (blockedError) {
      throw new SolicitudesServiceError('unknown', 'Error al verificar el estado de bloqueo.');
    }

    if ((blockedCount ?? 0) > 0) {
      throw new SolicitudesServiceError(
        'blocked',
        'Has alcanzado el límite de solicitudes rechazadas para esta organización.',
      );
    }

    // Guard 3: check if tenant requires a complete user profile
    const { data: tenantFlag, error: tenantFlagError } = await supabase
      .from('tenants')
      .select('requiere_perfil_completo')
      .eq('id', input.tenant_id)
      .single();

    if (tenantFlagError) {
      throw new SolicitudesServiceError('unknown', 'Error al verificar la configuración de la organización.');
    }

    if (tenantFlag?.requiere_perfil_completo) {
      const { data: userProfile, error: profileError } = await supabase
        .from('usuarios')
        .select('nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, rh')
        .eq('id', input.usuario_id)
        .single();

      if (profileError) {
        throw new SolicitudesServiceError('unknown', 'Error al verificar el perfil del usuario.');
      }

      const isComplete =
        userProfile &&
        userProfile.nombre?.trim() &&
        userProfile.apellido?.trim() &&
        userProfile.telefono?.trim() &&
        userProfile.fecha_nacimiento &&
        userProfile.tipo_identificacion?.trim() &&
        userProfile.numero_identificacion?.trim() &&
        userProfile.fecha_exp_identificacion &&
        userProfile.rh?.trim();

      if (!isComplete) {
        throw new SolicitudesServiceError(
          'incomplete_profile',
          'Esta organización requiere que completes tu perfil antes de solicitar acceso.',
        );
      }
    }

    // Insert new pendiente row
    const { error: insertError } = await supabase
      .from('miembros_tenant_solicitudes')
      .insert({
        tenant_id: input.tenant_id,
        usuario_id: input.usuario_id,
        mensaje: input.mensaje ?? null,
      });

    if (insertError) {
      throw new SolicitudesServiceError('unknown', 'No fue posible enviar la solicitud.');
    }
  },

  /**
   * Get solicitudes for a tenant (admin view), optionally filtered by estado.
   */
  async getSolicitudesByTenant(
    tenantId: string,
    estado?: SolicitudEstado,
  ): Promise<SolicitudRow[]> {
    const supabase = createClient();

    let query = supabase
      .from('miembros_tenant_solicitudes')
      .select(SOLICITUD_SELECT)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) {
      throw new SolicitudesServiceError('unknown', 'No fue posible cargar las solicitudes.');
    }

    return ((data ?? []) as unknown as RawSolicitudRow[]).map(mapRawRow);
  },

  /**
   * Get the last 3 solicitudes for a specific user/tenant (user view).
   */
  async getUserSolicitudesForTenant(
    tenantId: string,
    userId: string,
  ): Promise<SolicitudRow[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('miembros_tenant_solicitudes')
      .select(SOLICITUD_SELECT)
      .eq('tenant_id', tenantId)
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      throw new SolicitudesServiceError('unknown', 'No fue posible cargar el historial de solicitudes.');
    }

    return ((data ?? []) as unknown as RawSolicitudRow[]).map(mapRawRow);
  },

  /**
   * Accept a request: update estado → aceptada, then insert into miembros_tenant.
   */
  async aceptarSolicitud(input: AceptarSolicitudInput): Promise<void> {
    const supabase = createClient();

    // Step 1: update the solicitud
    const { error: updateError } = await supabase
      .from('miembros_tenant_solicitudes')
      .update({
        estado: 'aceptada',
        revisado_por: input.revisado_por,
        revisado_at: new Date().toISOString(),
      })
      .eq('id', input.solicitud_id);

    if (updateError) {
      throw new SolicitudesServiceError('unknown', 'No fue posible actualizar la solicitud.');
    }

    // Step 2: insert into miembros_tenant
    const { error: insertError } = await supabase
      .from('miembros_tenant')
      .insert({
        tenant_id: input.tenant_id,
        usuario_id: input.usuario_id,
        rol_id: input.rol_id,
      });

    if (insertError) {
      // Check for unique constraint violation (already_member)
      if (insertError.code === '23505') {
        throw new SolicitudesServiceError(
          'already_member',
          'Este usuario ya es miembro de la organización.',
        );
      }
      throw new SolicitudesServiceError('unknown', 'No fue posible crear la membresía.');
    }
  },

  /**
   * Reject a request: update estado → rechazada with optional nota_revision.
   * Auto-blocks the user if rejection count reaches tenant's max_solicitudes.
   */
  async rechazarSolicitud(input: RechazarSolicitudInput): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('miembros_tenant_solicitudes')
      .update({
        estado: 'rechazada',
        revisado_por: input.revisado_por,
        revisado_at: new Date().toISOString(),
        nota_revision: input.nota_revision ?? null,
      })
      .eq('id', input.solicitud_id);

    if (error) {
      throw new SolicitudesServiceError('unknown', 'No fue posible rechazar la solicitud.');
    }

    // Auto-block: check rejection count vs tenant max
    const [{ count: rejectionCount }, { data: tenantData }] = await Promise.all([
      supabase
        .from('miembros_tenant_solicitudes')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenant_id)
        .eq('usuario_id', input.usuario_id)
        .eq('estado', 'rechazada'),
      supabase
        .from('tenants')
        .select('max_solicitudes')
        .eq('id', input.tenant_id)
        .single(),
    ]);

    const maxSolicitudes = (tenantData as { max_solicitudes: number } | null)?.max_solicitudes ?? 2;

    if ((rejectionCount ?? 0) >= maxSolicitudes) {
      await this.bloquearUsuario({
        tenant_id: input.tenant_id,
        usuario_id: input.usuario_id,
        bloqueado_por: input.revisado_por,
        motivo: input.nota_revision ?? undefined,
      });
    }
  },

  /**
   * Check if a user is blocked for a tenant.
   */
  async getUserBloqueadoForTenant(tenantId: string, userId: string): Promise<boolean> {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('miembros_tenant_bloqueados')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('usuario_id', userId);

    if (error) {
      throw new SolicitudesServiceError('unknown', 'Error al verificar el estado de bloqueo.');
    }

    return (count ?? 0) > 0;
  },

  /**
   * Get all blocked users for a tenant (admin view).
   */
  async getBloqueadosByTenant(tenantId: string): Promise<BloqueadoRow[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('miembros_tenant_bloqueados')
      .select(BLOQUEADO_SELECT)
      .eq('tenant_id', tenantId)
      .order('bloqueado_at', { ascending: false });

    if (error) {
      throw new SolicitudesServiceError('unknown', 'No fue posible cargar los usuarios bloqueados.');
    }

    return ((data ?? []) as unknown as RawBloqueadoRow[]).map(mapBloqueadoRow);
  },

  /**
   * Block a user for a tenant.
   */
  async bloquearUsuario(input: BloquearUsuarioInput): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('miembros_tenant_bloqueados')
      .insert({
        tenant_id: input.tenant_id,
        usuario_id: input.usuario_id,
        bloqueado_por: input.bloqueado_por ?? null,
        motivo: input.motivo ?? null,
      });

    // ON CONFLICT (tenant_id, usuario_id) — Supabase unique violation code 23505
    if (error && error.code !== '23505') {
      throw new SolicitudesServiceError('unknown', 'No fue posible bloquear al usuario.');
    }
  },

  /**
   * Unblock a user for a tenant.
   */
  async desbloquearUsuario(tenantId: string, usuarioId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('miembros_tenant_bloqueados')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('usuario_id', usuarioId);

    if (error) {
      throw new SolicitudesServiceError('unknown', 'No fue posible desbloquear al usuario.');
    }
  },
};
