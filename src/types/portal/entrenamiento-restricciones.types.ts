// ─────────────────────────────────────────────
// Booking restriction types
// ─────────────────────────────────────────────

export type EntrenamientoRestriccion = {
  id: string;
  tenant_id: string;
  entrenamiento_id: string;
  usuario_estado: string | null;
  plan_id: string | null;
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type EntrenamientoRestriccionInput = {
  entrenamiento_id?: string;
  usuario_estado: string | null;
  plan_id: string | null;
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
};

export type EntrenamientoGrupoRestriccion = {
  id: string;
  tenant_id: string;
  entrenamiento_grupo_id: string;
  usuario_estado: string | null;
  plan_id: string | null;
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type EntrenamientoGrupoRestriccionInput = {
  entrenamiento_grupo_id?: string;
  usuario_estado: string | null;
  plan_id: string | null;
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
};

// ─────────────────────────────────────────────
// Booking result (discriminated union)
// ─────────────────────────────────────────────

export type BookingRejectionCode =
  | 'TIMING_RESERVA'
  | 'TIMING_CANCELACION'
  | 'USUARIO_INACTIVO'
  | 'PLAN_REQUERIDO'
  | 'DISCIPLINA_REQUERIDA'
  | 'NIVEL_INSUFICIENTE';

export type BookingRejection = {
  ok: false;
  code: BookingRejectionCode;
  message: string;
};

export type BookingResult = { ok: true } | BookingRejection;
