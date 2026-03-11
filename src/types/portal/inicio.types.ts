export interface InicioStats {
  suscripcionesActivas: number;
  proximosEntrenamientos: number;
  pagosPendientes: number;
  organizaciones: number;
}

export interface InicioEntrenamiento {
  id: string;
  nombre: string;
  fecha_hora: string;
  disciplina_nombre: string | null;
  escenario_nombre: string | null;
  punto_encuentro: string | null;
  org_nombre: string;
  tenant_id: string;
  reserva_id: string;
  reserva_estado: string;
}

export interface InicioSuscripcion {
  id: string;
  tenant_id: string;
  plan_nombre: string;
  org_nombre: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  pago_estado: string | null;
}

export interface InicioPagoPendiente {
  id: string;
  monto: number;
  metodo_pago: string | null;
  plan_nombre: string;
  org_nombre: string;
  fecha_pago: string | null;
}

export interface InicioMembresia {
  tenant_id: string;
  org_nombre: string;
  org_logo: string | null;
  rol_nombre: string;
}

export interface InicioDashboardData {
  stats: InicioStats;
  proximosEntrenamientos: InicioEntrenamiento[];
  suscripciones: InicioSuscripcion[];
  pagosPendientes: InicioPagoPendiente[];
  membresias: InicioMembresia[];
}
