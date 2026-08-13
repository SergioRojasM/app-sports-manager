export type PagoEstado = 'pendiente' | 'validado' | 'rechazado';

export type Pago = {
  id: string;
  tenant_id: string;
  suscripcion_id: string;
  monto: number;
  metodo_pago: string | null;
  metodo_pago_id: string | null;
  comprobante_path: string | null;
  estado: PagoEstado;
  validado_por: string | null;
  fecha_pago: string | null;
  fecha_validacion: string | null;
  /** Reason entered by the admin when estado is 'rechazado', shown to the athlete (US-0106). */
  motivo_rechazo: string | null;
  created_at: string;
};

export type PagoInsert = {
  tenant_id: string;
  suscripcion_id: string;
  monto: number;
  comprobante_path: null;
  estado: 'pendiente';
  metodo_pago_id?: string | null;
};
