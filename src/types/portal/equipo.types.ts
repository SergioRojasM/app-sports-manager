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
  readonly code: 'forbidden' | 'unknown';

  constructor(code: 'forbidden' | 'unknown', message: string) {
    super(message);
    this.name = 'EquipoServiceError';
    this.code = code;
  }
}
