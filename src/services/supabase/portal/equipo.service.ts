import { createClient } from '@/services/supabase/client';
import {
  EquipoServiceError,
  type CambiarEstadoMiembroInput,
  type CambiarRolMiembroInput,
  type EditarPerfilMiembroInput,
  type EliminarMiembroInput,
  type EquipoStats,
  type MiembroEstado,
  type MiembroNovedad,
  type MiembroRow,
  type PerfilDeportivoRow,
  type RolOption,
  type TipoIdentificacion,
} from '@/types/portal/equipo.types';
import type { BloquearUsuarioInput } from '@/types/portal/solicitudes.types';

/* ────────── Raw row shape returned by v_miembros_equipo view ────────── */

type RawMiembroRow = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  rol_id: string;
  estado: string;
  nombre: string | null;
  apellido: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  fecha_nacimiento: string | null;
  fecha_exp_identificacion: string | null;
  telefono: string | null;
  email: string;
  foto_url: string | null;
  rh: string | null;
  rol_nombre: string;
  inasistencias_recientes: number;
};

/* ────────── Mappers ────────── */

function mapRawRow(row: RawMiembroRow): MiembroRow {
  return {
    miembro_id: row.id,
    usuario_id: row.usuario_id,
    nombre: row.nombre ?? '',
    apellido: row.apellido ?? '',
    tipo_identificacion: (row.tipo_identificacion as TipoIdentificacion) ?? null,
    numero_identificacion: row.numero_identificacion ?? null,
    fecha_nacimiento: row.fecha_nacimiento ?? null,
    fecha_exp_identificacion: row.fecha_exp_identificacion ?? null,
    telefono: row.telefono ?? null,
    email: row.email,
    foto_url: row.foto_url ?? null,
    estado: (row.estado as MiembroEstado) ?? 'activo',
    rh: row.rh ?? null,
    rol_nombre: row.rol_nombre,
    inasistencias_recientes: row.inasistencias_recientes ?? 0,
  };
}

function mapPostgrestError(
  error: { code?: string; message?: string } | null,
): EquipoServiceError {
  if (!error) {
    return new EquipoServiceError('unknown', 'No fue posible cargar el equipo.');
  }

  if (error.code === '42501') {
    return new EquipoServiceError(
      'forbidden',
      'No tienes permisos para ver los miembros de esta organización.',
    );
  }

  return new EquipoServiceError('unknown', 'No fue posible cargar el equipo.');
}

/* ────────── Pure helper: stats derivation ────────── */

export function getEquipoStats(members: MiembroRow[]): EquipoStats {
  let miembrosActivos = 0;
  let miembrosEnMora = 0;
  let miembrosSuspendidos = 0;
  let miembrosInactivos = 0;
  let usuariosActivos = 0;
  let administradoresActivos = 0;
  let entrenadoresActivos = 0;

  for (const m of members) {
    const rol = m.rol_nombre.toLowerCase();

    switch (m.estado) {
      case 'activo':
        miembrosActivos++;
        if (rol === 'usuario') usuariosActivos++;
        if (rol === 'administrador') administradoresActivos++;
        if (rol === 'entrenador') entrenadoresActivos++;
        break;
      case 'mora':
        miembrosEnMora++;
        break;
      case 'suspendido':
        miembrosSuspendidos++;
        break;
      case 'inactivo':
        miembrosInactivos++;
        break;
    }
  }

  return {
    totalMiembros: members.length,
    miembrosActivos,
    miembrosEnMora,
    miembrosSuspendidos,
    miembrosInactivos,
    usuariosActivos,
    administradoresActivos,
    entrenadoresActivos,
  };
}

/* ────────── Service object ────────── */

export const equipoService = {
  /**
   * Fetch all members of a tenant with their user and role data.
   * Uses the browser Supabase client (RLS-aware).
   */
  async getEquipo(tenantId: string): Promise<MiembroRow[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('v_miembros_equipo')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('usuario_id');

    if (error) {
      throw mapPostgrestError(error);
    }

    return ((data ?? []) as unknown as RawMiembroRow[]).map(mapRawRow);
  },

  /**
   * Fetch sports profile (peso_kg, altura_cm) for a given user.
   * Returns nulls if no row exists.
   */
  async getPerfilDeportivo(usuarioId: string): Promise<PerfilDeportivoRow> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('perfil_deportivo')
      .select('peso_kg, altura_cm')
      .eq('user_id', usuarioId)
      .maybeSingle();

    if (error) throw mapPostgrestError(error);

    return { peso_kg: data?.peso_kg ?? null, altura_cm: data?.altura_cm ?? null };
  },

  /**
   * Update a member's profile (usuarios + optional perfil_deportivo upsert).
   */
  async editarPerfilMiembro(input: EditarPerfilMiembroInput): Promise<void> {
    const supabase = createClient();

    const { error: userError } = await supabase
      .from('usuarios')
      .update({
        nombre: input.nombre,
        apellido: input.apellido ?? null,
        telefono: input.telefono ?? null,
        fecha_nacimiento: input.fecha_nacimiento ?? null,
        tipo_identificacion: input.tipo_identificacion ?? null,
        numero_identificacion: input.numero_identificacion ?? null,
        rh: input.rh ?? null,
      })
      .eq('id', input.usuario_id);

    if (userError) throw mapPostgrestError(userError);

    if (input.peso_kg != null || input.altura_cm != null) {
      const { error: perfilError } = await supabase
        .from('perfil_deportivo')
        .upsert(
          {
            user_id: input.usuario_id,
            peso_kg: input.peso_kg ?? null,
            altura_cm: input.altura_cm ?? null,
          },
          { onConflict: 'user_id' },
        );

      if (perfilError) throw mapPostgrestError(perfilError);
    }
  },

  /**
   * Remove a member from the tenant (delete miembros_tenant row).
   */
  async eliminarMiembro(input: EliminarMiembroInput): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('miembros_tenant')
      .delete()
      .eq('id', input.miembro_id)
      .eq('tenant_id', input.tenant_id);

    if (error) throw mapPostgrestError(error);
  },

  /**
   * Block a member from the team: insert block record first, then remove membership.
   */
  async bloquearMiembroDelEquipo(
    input: BloquearUsuarioInput & { miembro_id: string },
  ): Promise<void> {
    const supabase = createClient();

    const { error: blockError } = await supabase
      .from('miembros_tenant_bloqueados')
      .insert({
        tenant_id: input.tenant_id,
        usuario_id: input.usuario_id,
        bloqueado_por: input.bloqueado_por,
        motivo: input.motivo ?? null,
      });

    if (blockError) throw mapPostgrestError(blockError);

    const { error: deleteError } = await supabase
      .from('miembros_tenant')
      .delete()
      .eq('id', input.miembro_id)
      .eq('tenant_id', input.tenant_id);

    if (deleteError) throw mapPostgrestError(deleteError);
  },

  /**
   * Fetch all available roles from the roles lookup table.
   */
  async getRoles(): Promise<RolOption[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('roles')
      .select('id, nombre')
      .order('nombre');

    if (error) throw mapPostgrestError(error);

    return (data ?? []) as RolOption[];
  },

  /**
   * Change a member's role with last-admin guard.
   * Throws 'last_admin' if the member is the sole admin and is being demoted.
   * Throws 'not_found' if the member row doesn't exist in the tenant.
   */
  async cambiarRolMiembro(input: CambiarRolMiembroInput): Promise<void> {
    const supabase = createClient();

    // Fetch current member to get current rol_id
    const { data: currentMember, error: fetchError } = await supabase
      .from('miembros_tenant')
      .select('rol_id, roles!inner(nombre)')
      .eq('id', input.miembro_id)
      .eq('tenant_id', input.tenant_id)
      .maybeSingle();

    if (fetchError) throw mapPostgrestError(fetchError);
    if (!currentMember) {
      throw new EquipoServiceError('not_found', 'El miembro no fue encontrado en esta organización.');
    }

    const currentRolNombre = (currentMember.roles as unknown as { nombre: string }).nombre;

    // Fetch the new role name to check if we're changing away from admin
    const { data: newRole, error: newRoleError } = await supabase
      .from('roles')
      .select('nombre')
      .eq('id', input.nuevo_rol_id)
      .single();

    if (newRoleError) throw mapPostgrestError(newRoleError);

    // Last-admin guard: if current role is admin and new is not, check count
    if (
      currentRolNombre.toLowerCase() === 'administrador' &&
      newRole.nombre.toLowerCase() !== 'administrador'
    ) {
      const { count, error: countError } = await supabase
        .from('miembros_tenant')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenant_id)
        .eq('rol_id', currentMember.rol_id);

      if (countError) throw mapPostgrestError(countError);

      if ((count ?? 0) <= 1) {
        throw new EquipoServiceError(
          'last_admin',
          'No se puede cambiar el rol del único administrador de la organización. Asigna otro administrador primero.',
        );
      }
    }

    // Execute the UPDATE
    const { data: updated, error: updateError } = await supabase
      .from('miembros_tenant')
      .update({ rol_id: input.nuevo_rol_id })
      .eq('id', input.miembro_id)
      .eq('tenant_id', input.tenant_id)
      .select('id');

    if (updateError) {
      if (updateError.code === '42501') {
        throw new EquipoServiceError('forbidden', 'No tienes permisos para cambiar el rol de este miembro.');
      }
      throw mapPostgrestError(updateError);
    }

    if (!updated || updated.length === 0) {
      throw new EquipoServiceError('not_found', 'El miembro no fue encontrado en esta organización.');
    }
  },

  /**
   * Atomically change a member's tenant-scoped status and record an audit novedad.
   * Delegates to the cambiar_estado_miembro SECURITY DEFINER RPC.
   */
  async cambiarEstadoMiembro(input: CambiarEstadoMiembroInput): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.rpc('cambiar_estado_miembro', {
      p_miembro_id: input.miembroId,
      p_tenant_id: input.tenantId,
      p_nuevo_estado: input.nuevoEstado,
      p_tipo: input.tipo,
      p_descripcion: input.descripcion ?? null,
    });

    if (error) {
      if (error.code === '42501') {
        throw new EquipoServiceError('forbidden', 'No tienes permisos para cambiar el estado de este miembro.');
      }
      if (error.code === 'P0002') {
        throw new EquipoServiceError('not_found', 'El miembro no fue encontrado en esta organización.');
      }
      throw new EquipoServiceError('unknown', 'No fue posible cambiar el estado del miembro.');
    }
  },

  /**
   * Fetch the audit log (novedades) for a specific member in a tenant.
   * Returns newest-first.
   */
  async getNovedadesMiembro(miembroId: string, tenantId: string): Promise<MiembroNovedad[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('miembros_tenant_novedades')
      .select('id, miembro_id, tipo, descripcion, estado_resultante, registrado_por, created_at')
      .eq('miembro_id', miembroId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw mapPostgrestError(error);

    return (data ?? []) as unknown as MiembroNovedad[];
  },
};
