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
  created_at: string;
};

export type ReservaView = Reserva & {
  atleta_nombre: string;
  atleta_apellido: string;
  atleta_email: string;
};

export type CreateReservaInput = {
  tenant_id: string;
  atleta_id: string;
  entrenamiento_id: string;
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
