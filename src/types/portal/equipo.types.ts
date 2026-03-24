/* ───────────────────────────────────────────────
 * equipo.types.ts
 * Domain types for the Gestión Equipo feature slice.
 * ─────────────────────────────────────────────── */

/** Allowed values for tipo_identificacion (mirrors DB check constraint). */
export type TipoIdentificacion = 'CC' | 'CE' | 'TI' | 'NIT' | 'Pasaporte' | 'Otro';

/** Allowed values for the usuario estado column. */
export type MiembroEstado = 'activo' | 'mora' | 'suspendido' | 'inactivo';

/** Raw row returned by the equipo service join query. */
export type MiembroRow = {
  usuario_id: string;
  nombre: string;
  apellido: string;
  tipo_identificacion: TipoIdentificacion | null;
  numero_identificacion: string | null;
  telefono: string | null;
  email: string;
  foto_url: string | null;
  estado: MiembroEstado;
  rh: string | null;
  miembro_id: string;
  rol_nombre: string;
  inasistencias_recientes: number;
};

/** Presentational view-model used by EquipoTable. */
export type MiembroTableItem = MiembroRow & {
  fullName: string;
  estadoLabel: string;
};

/** Aggregate statistics derived in-memory from the member list. */
export type EquipoStats = {
  totalMiembros: number;
  miembrosActivos: number;
  miembrosEnMora: number;
  miembrosSuspendidos: number;
  miembrosInactivos: number;
  usuariosActivos: number;
  administradoresActivos: number;
  entrenadoresActivos: number;
};

/** Service-level error with a typed code. */
export class EquipoServiceError extends Error {
  readonly code: 'forbidden' | 'unknown' | 'last_admin' | 'not_found';

  constructor(code: 'forbidden' | 'unknown' | 'last_admin' | 'not_found', message: string) {
    super(message);
    this.name = 'EquipoServiceError';
    this.code = code;
  }
}

export type UsuarioNivelDisciplina = {
  id: string;
  usuario_id: string;
  tenant_id: string;
  disciplina_id: string;
  nivel_id: string;
  asignado_por: string;
  created_at: string;
  updated_at: string;
};

export type UsuarioNivelDisciplinaInput = {
  usuario_id: string;
  tenant_id: string;
  disciplina_id: string;
  nivel_id: string;
};

export type AsignarNivelView = {
  disciplina_id: string;
  disciplina_nombre: string;
  niveles: Array<{ id: string; nombre: string; orden: number }>;
  nivel_actual_id: string | null;
};

/* ───────── Admin action inputs (US-0027) ───────── */

/** Input for editing a member's profile (usuarios + perfil_deportivo). */
export type EditarPerfilMiembroInput = {
  usuario_id: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  tipo_identificacion?: TipoIdentificacion | null;
  numero_identificacion?: string | null;
  rh?: string | null;
  peso_kg?: number | null;
  altura_cm?: number | null;
};

/** Input for removing a member from a tenant. */
export type EliminarMiembroInput = {
  miembro_id: string;
  tenant_id: string;
};

/** Return shape for getPerfilDeportivo. */
export type PerfilDeportivoRow = {
  peso_kg: number | null;
  altura_cm: number | null;
};

/* ───────── Role editing types (US-0029) ───────── */

/** A selectable role option from the roles lookup table. */
export type RolOption = {
  id: string;
  nombre: string;
};

/** Input for changing a member's role. */
export type CambiarRolMiembroInput = {
  miembro_id: string;
  tenant_id: string;
  nuevo_rol_id: string;
};

/* ───────── Tenant-scoped status types (US-0037) ───────── */

/** Allowed novedad types for member status changes. */
export type MiembroNovedadTipo =
  | 'falta_pago'
  | 'inasistencias_acumuladas'
  | 'suspension_manual'
  | 'reactivacion'
  | 'otro';

/** A single audit-log entry for a member status change. */
export type MiembroNovedad = {
  id: string;
  miembro_id: string;
  tipo: MiembroNovedadTipo;
  descripcion: string | null;
  estado_resultante: MiembroEstado;
  registrado_por: string;
  created_at: string;
};

/** Input for changing a member's tenant-scoped status. */
export type CambiarEstadoMiembroInput = {
  miembroId: string;
  tenantId: string;
  nuevoEstado: MiembroEstado;
  tipo: MiembroNovedadTipo;
  descripcion?: string;
};
