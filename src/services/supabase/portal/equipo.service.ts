import { createClient } from '@/services/supabase/client';
import {
  EquipoServiceError,
  type EquipoStats,
  type MiembroEstado,
  type MiembroRow,
  type TipoIdentificacion,
} from '@/types/portal/equipo.types';

/* ────────── Raw row shape returned by Supabase ────────── */

type RawMiembroRow = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  rol_id: string;
  usuarios: {
    nombre: string | null;
    apellido: string | null;
    tipo_identificacion: string | null;
    numero_identificacion: string | null;
    telefono: string | null;
    email: string;
    foto_url: string | null;
    estado: string;
    rh: string | null;
  };
  roles: {
    nombre: string;
  };
};

/* ────────── Mappers ────────── */

function mapRawRow(row: RawMiembroRow): MiembroRow {
  return {
    miembro_id: row.id,
    usuario_id: row.usuario_id,
    nombre: row.usuarios.nombre ?? '',
    apellido: row.usuarios.apellido ?? '',
    tipo_identificacion: (row.usuarios.tipo_identificacion as TipoIdentificacion) ?? null,
    numero_identificacion: row.usuarios.numero_identificacion ?? null,
    telefono: row.usuarios.telefono ?? null,
    email: row.usuarios.email,
    foto_url: row.usuarios.foto_url ?? null,
    estado: (row.usuarios.estado as MiembroEstado) ?? 'activo',
    rh: row.usuarios.rh ?? null,
    rol_nombre: row.roles.nombre,
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
      .from('miembros_tenant')
      .select(
        'id, tenant_id, usuario_id, rol_id, usuarios!inner(nombre, apellido, tipo_identificacion, numero_identificacion, telefono, email, foto_url, estado, rh), roles!inner(nombre)',
      )
      .eq('tenant_id', tenantId)
      .order('usuario_id');

    if (error) {
      throw mapPostgrestError(error);
    }

    return ((data ?? []) as unknown as RawMiembroRow[]).map(mapRawRow);
  },
};
