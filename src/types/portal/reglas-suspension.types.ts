export type ReglaSuspension = {
  id: string;
  tenant_id: string;
  nombre: string;
  num_inasistencias: number;
  por_suscripcion: boolean;
  por_dias_atras: number;
  duracion: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ReglaSuspensionCreatePayload = {
  tenant_id: string;
  nombre: string;
  num_inasistencias: number;
  por_suscripcion: boolean;
  por_dias_atras: number;
  duracion: number;
  activo?: boolean;
};

export type ReglaSuspensionUpdatePayload = {
  nombre?: string;
  num_inasistencias?: number;
  por_suscripcion?: boolean;
  por_dias_atras?: number;
  duracion?: number;
  activo?: boolean;
};

export type ReglaSuspensionFormValues = {
  nombre: string;
  num_inasistencias: string;
  por_suscripcion: boolean;
  por_dias_atras: string;
  duracion: string;
  activo: boolean;
};
