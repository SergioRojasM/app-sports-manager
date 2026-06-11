export type SuscripcionEstado = 'pendiente' | 'activa' | 'vencida' | 'cancelada';

export type Suscripcion = {
  id: string;
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  plan_tipo_id: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  comentarios: string | null;
  estado: SuscripcionEstado;
  created_at: string;
};

export type SuscripcionInsert = {
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  plan_tipo_id?: string | null;
  comentarios: string | null;
  estado: 'pendiente';
};

export type SuscripcionServicio = {
  id: string;
  suscripcion_id: string;
  servicio_id: string;
  unidades_incluidas: number | null;
  unidades_restantes: number | null;
  created_at: string;
};

export interface SuscripcionServicioDisplay {
  servicio_id: string;
  servicio_nombre: string;
  unidades_incluidas: number | null;
  unidades_restantes: number | null;
}
