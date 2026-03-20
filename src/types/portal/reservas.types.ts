export type ReservaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

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
  entrenamiento_id: string;
  reserva_estado: string;
  fecha_reserva: string | null;
  fecha_cancelacion: string | null;
  notas_reserva: string | null;
  created_at: string;
  atleta_nombre: string | null;
  atleta_apellido: string | null;
  atleta_email: string;
  atleta_telefono: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
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
