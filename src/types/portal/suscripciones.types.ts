export type SuscripcionEstado = 'pendiente' | 'activa' | 'vencida' | 'cancelada';

export type Suscripcion = {
  id: string;
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  comentarios: string | null;
  estado: SuscripcionEstado;
  created_at: string;
};

export type SuscripcionInsert = {
  tenant_id: string;
  atleta_id: string;
  plan_id: string;
  clases_plan: number | null;
  comentarios: string | null;
  estado: 'pendiente';
};
