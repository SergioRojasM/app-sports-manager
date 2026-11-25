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
  pago_estado: string | null;
  servicios: import('@/types/portal/suscripciones.types').SuscripcionServicioDisplay[];
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

/** One day of the 7-day agenda window, keyed by its Bogotá calendar date. */
export interface InicioAgendaDia {
  /** `YYYY-MM-DD` in America/Bogota. */
  key: string;
  /** Upper-case weekday abbreviation: DOM, LUN, MAR, MIÉ, JUE, VIE, SÁB. */
  dow: string;
  /** Day of the month. */
  dia: number;
  /** Accessible day name, e.g. "Jueves 19". */
  nombreLargo: string;
}

/** 7-day agenda window starting today in Bogotá (US: grit-arena-v3 inicio). */
export interface InicioVentana {
  /** ISO instant: lower bound for upcoming sessions (the current time). */
  desde: string;
  /** ISO instant: end of the 7th day in Bogotá. */
  hasta: string;
  /** Key of today, decided on the server to avoid hydration mismatches. */
  hoyKey: string;
  dias: InicioAgendaDia[];
  /** "15 – 21 nov" or "28 nov – 4 dic". */
  rangoLabel: string;
}

export interface InicioDashboardData {
  stats: InicioStats;
  proximosEntrenamientos: InicioEntrenamiento[];
  suscripciones: InicioSuscripcion[];
  pagosPendientes: InicioPagoPendiente[];
  membresias: InicioMembresia[];
}
