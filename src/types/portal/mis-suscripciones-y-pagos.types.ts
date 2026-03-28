import type { SuscripcionEstado, PagoEstado } from '@/types/portal/gestion-suscripciones.types';

export type { SuscripcionEstado, PagoEstado };

export interface MiPagoRow {
  id: string;
  monto: number;
  metodo_pago_nombre: string | null;
  metodo_pago_tipo: string | null;
  estado: PagoEstado;
  fecha_pago: string | null;
  comprobante_path: string | null;
}

export interface MiSuscripcionRow {
  id: string;
  plan_nombre: string;
  estado: SuscripcionEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  pago: MiPagoRow | null;
}
