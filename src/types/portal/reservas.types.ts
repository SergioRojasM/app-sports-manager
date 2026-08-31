export type ReservaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'rechazada';

export type ReservaServicio = {
  id: string;
  reserva_id: string;
  suscripcion_id: string | null;
  servicio_id: string;
  created_at: string;
};

export type Reserva = {
  id: string;
  tenant_id: string;
  atleta_id: string;
  entrenamiento_id: string;
  fecha_reserva: string | null;
  estado: ReservaEstado;
  notas: string | null;
  fecha_cancelacion: string | null;
  suscripcion_id: string | null;
  formulario_respuesta_id: string | null;
  /** Reason shown to the athlete when estado is 'rechazada' (US-0106). */
  motivo_rechazo: string | null;
  created_at: string;
};

export type ReservaView = Reserva & {
  atleta_nombre: string;
  atleta_apellido: string;
  atleta_email: string;
  entrenamiento_categoria_id?: string | null;
  categoria_nombre?: string | null;
};

export type CreateReservaInput = {
  tenant_id: string;
  atleta_id: string;
  entrenamiento_id: string;
  entrenamiento_categoria_id?: string | null;
  notas?: string;
  bypass_restrictions?: boolean;
  confirmed_no_units?: boolean;
  /** Internal form template attached to the training, when a response is being submitted. */
  formulario_plantilla_id?: string | null;
  /** Collected answers keyed by each "datos" section's campo_nombre. */
  formulario_respuesta?: Record<string, string> | null;
  /**
   * Set when the target public training has `omitir_confirmacion_plan = true` and the
   * athlete chose to continue booking despite lacking the required plan/service — lets
   * `create()` insert the reservation as 'pendiente' instead of rejecting it outright.
   * Re-verified server-side against the training's publication before being honored (US-0106).
   */
  permitir_pendiente_sin_plan?: boolean;
  /**
   * The plan purchase to create *together with* this booking, in one transaction (US-0110).
   * Nothing has been written for it yet: the athlete picked a plan and filled in payment
   * details, but the suscripcion/pago rows are only inserted by the booking RPC itself, so
   * abandoning the flow before submitting leaves no orphaned pending subscription behind.
   * The resulting subscription is linked back via `reservas.suscripcion_id`.
   */
  plan_pendiente_compra?: {
    plan_id: string;
    plan_tipo_id: string | null;
    comentarios: string | null;
    metodo_pago_id: string;
    monto: number;
  } | null;
};

export type UpdateReservaInput = {
  estado?: ReservaEstado;
  notas?: string;
  fecha_cancelacion?: string;
};

export type ReservaCapacidad = {
  entrenamiento_id: string;
  cupo_maximo: number | null;
  reservas_activas: number;
  disponible: boolean;
};

export type CategoriaDisponibilidad = {
  id: string;
  nivel_id: string;
  nombre: string;
  orden: number;
  cupos_asignados: number;
  reservas_activas: number;
  disponible: boolean;
};

export type ReservaReportRow = {
  reserva_id: string;
  tenant_id: string;
  tenant_nombre: string | null;
  entrenamiento_id: string;
  atleta_id: string;
  reserva_estado: string;
  fecha_reserva: string | null;
  fecha_cancelacion: string | null;
  notas_reserva: string | null;
  /** Reason shown to the athlete when reserva_estado is 'rechazada' (US-0106). */
  motivo_rechazo: string | null;
  created_at: string;
  atleta_nombre: string | null;
  atleta_apellido: string | null;
  atleta_email: string;
  atleta_telefono: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  fecha_nacimiento: string | null;
  fecha_exp_identificacion: string | null;
  entrenamiento_nombre: string | null;
  entrenamiento_fecha: string | null;
  disciplina: string | null;
  escenario: string | null;
  nivel_disciplina: string | null;
  asistio: boolean | null;
  fecha_asistencia: string | null;
  observaciones_asistencia: string | null;
  validado_por_email: string | null;
};

export type ReservasManagementAsistencia = 'asistio' | 'no_asistio' | 'sin_registrar';

export type ReservasManagementFilters = {
  tenantId: string;
  fechaDesde?: string;
  fechaHasta?: string;
  atletaSearch?: string;
  asistencia?: ReservasManagementAsistencia;
  disciplinaNombre?: string;
  limit?: number;
};

export type MisReservasFilters = {
  tenantId?: string;
  atletaId: string;
  fechaDesde?: string;
  fechaHasta?: string;
  asistencia?: ReservasManagementAsistencia;
  disciplinaNombre?: string;
  limit?: number;
};
