import { createClient } from '@/services/supabase/client';
import {
  SolicitudesServiceError,
  type AceptarSolicitudInput,
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

    // Guard 2: count rechazada rows
    const { count, error: countError } = await supabase
      .from('miembros_tenant_solicitudes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', input.tenant_id)
      .eq('usuario_id', input.usuario_id)
      .eq('estado', 'rechazada');

    if (countError) {
      throw new SolicitudesServiceError('unknown', 'Error al verificar historial de solicitudes.');
    }

    if ((count ?? 0) >= 3) {
      throw new SolicitudesServiceError(
        'max_rejections',
        'Has alcanzado el límite de solicitudes rechazadas para esta organización.',
      );
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
  },
};
