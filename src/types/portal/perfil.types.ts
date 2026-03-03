// ─────────────────────────────────────────────────────────────────────────────
// Types for the user profile feature (US0018)
// ─────────────────────────────────────────────────────────────────────────────

export type TipoIdentificacion = 'CC' | 'CE' | 'TI' | 'NIT' | 'Pasaporte' | 'Otro';

export type TipoRH = 'O+' | 'O−' | 'A+' | 'A−' | 'B+' | 'B−' | 'AB+' | 'AB−';

/* ────────── Domain models ────────── */

export type PerfilUsuario = {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null; // ISO date string (YYYY-MM-DD)
  foto_url: string | null;
  tipo_identificacion: TipoIdentificacion | null;
  numero_identificacion: string | null;
  rh: string | null;
};

export type PerfilDeportivo = {
  id: string;
  user_id: string;
  peso_kg: number | null;   // numeric(5,2)
  altura_cm: number | null; // numeric(5,2)
};

/* ────────── Form contracts ────────── */

/** All fields as strings so React controlled inputs work uniformly */
export type PerfilFormValues = {
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_nacimiento: string;
  tipo_identificacion: TipoIdentificacion | '';
  numero_identificacion: string;
  rh: TipoRH | '';
  /** String representation to avoid numeric input quirks */
  peso_kg: string;
  /** String representation to avoid numeric input quirks */
  altura_cm: string;
};

export type PerfilFormField = keyof PerfilFormValues;

export type PerfilFieldErrors = Partial<Record<PerfilFormField, string>>;

/* ────────── Service error ────────── */

export class PerfilServiceError extends Error {
  readonly code: 'forbidden' | 'not_found' | 'unknown';

  constructor(code: 'forbidden' | 'not_found' | 'unknown', message: string) {
    super(message);
    this.name = 'PerfilServiceError';
    this.code = code;
  }
}
