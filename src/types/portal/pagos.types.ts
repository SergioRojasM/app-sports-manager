export type PagoEstado = 'pendiente' | 'aprobado' | 'rechazado';

export type Pago = {
  id: string;
  tenant_id: string;
  suscripcion_id: string;
  monto: number;
  metodo_pago: string | null;
  comprobante_url: string | null;
  estado: PagoEstado;
  validado_por: string | null;
  fecha_pago: string | null;
  fecha_validacion: string | null;
  created_at: string;
};

export type PagoInsert = {
  tenant_id: string;
  suscripcion_id: string;
  monto: number;
  comprobante_url: null;
  estado: 'pendiente';
};
