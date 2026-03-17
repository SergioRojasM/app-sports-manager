export type MetodoPagoTipo = 'transferencia' | 'efectivo' | 'tarjeta' | 'pasarela' | 'otro';

export type MetodoPago = {
  id: string;
  tenant_id: string;
  nombre: string;
  tipo: MetodoPagoTipo;
  valor: string | null;
  url: string | null;
  comentarios: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type CreateMetodoPagoInput = {
  tenant_id: string;
  nombre: string;
  tipo: MetodoPagoTipo;
  valor?: string | null;
  url?: string | null;
  comentarios?: string | null;
  activo?: boolean;
  orden?: number;
};

export type UpdateMetodoPagoInput = {
  nombre?: string;
  tipo?: MetodoPagoTipo;
  valor?: string | null;
  url?: string | null;
  comentarios?: string | null;
  activo?: boolean;
  orden?: number;
};
