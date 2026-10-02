export type MetodoPagoTipo = 'transferencia' | 'efectivo' | 'tarjeta' | 'pasarela' | 'otro';

export const METODO_PAGO_TIPO_LABELS: Record<MetodoPagoTipo, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  pasarela: 'Pasarela',
  otro: 'Otro',
};

export type MetodoPago = {
  id: string;
  tenant_id: string;
  nombre: string;
  tipo: MetodoPagoTipo;
  valor: string | null;
  url: string | null;
  comentarios: string | null;
  /** Signed URL of the optional QR image (US-0128). */
  qr_url: string | null;
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
  qr_url?: string | null;
  activo?: boolean;
  orden?: number;
};

export type UpdateMetodoPagoInput = {
  nombre?: string;
  tipo?: MetodoPagoTipo;
  valor?: string | null;
  url?: string | null;
  comentarios?: string | null;
  qr_url?: string | null;
  activo?: boolean;
  orden?: number;
};

/** QR image change requested from the payment method form (US-0128). */
export type MetodoPagoQrChange = {
  file: File | null;
  remove: boolean;
};

export const METODO_PAGO_QR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const METODO_PAGO_QR_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
