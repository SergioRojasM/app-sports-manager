// ─────────────────────────────────────────────
// Booking restriction types
// ─────────────────────────────────────────────

export type EntrenamientoRestriccion = {
  id: string;
  tenant_id: string;
  entrenamiento_id: string;
  usuario_estado: string | null;
  /** @deprecated Legacy column — no longer evaluated. Will be removed in a future clean-up US. */
  plan_id: string | null;
  /** @deprecated Legacy column — no longer evaluated. Will be removed in a future clean-up US. */
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
  descripcion: string | null;
  servicio_1_id: string | null;
  servicio_2_id: string | null;
  servicio_3_id: string | null;
  servicio_4_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EntrenamientoRestriccionInput = {
  entrenamiento_id?: string;
  usuario_estado: string | null;
  /** @deprecated Legacy field — no longer written. Will be removed in a future clean-up US. */
  plan_id: string | null;
  /** @deprecated Legacy field — no longer written. Will be removed in a future clean-up US. */
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
  descripcion: string | null;
  servicio_1_id: string | null;
  servicio_2_id: string | null;
  servicio_3_id: string | null;
  servicio_4_id: string | null;
};

export type EntrenamientoGrupoRestriccion = {
  id: string;
  tenant_id: string;
  entrenamiento_grupo_id: string;
  usuario_estado: string | null;
  /** @deprecated Legacy column — no longer evaluated. Will be removed in a future clean-up US. */
  plan_id: string | null;
  /** @deprecated Legacy column — no longer evaluated. Will be removed in a future clean-up US. */
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
  descripcion: string | null;
  servicio_1_id: string | null;
  servicio_2_id: string | null;
  servicio_3_id: string | null;
  servicio_4_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EntrenamientoGrupoRestriccionInput = {
  entrenamiento_grupo_id?: string;
  usuario_estado: string | null;
  /** @deprecated Legacy field — no longer written. Will be removed in a future clean-up US. */
  plan_id: string | null;
  /** @deprecated Legacy field — no longer written. Will be removed in a future clean-up US. */
  disciplina_id: string | null;
  validar_nivel_disciplina: boolean;
  orden: number;
  descripcion: string | null;
  servicio_1_id: string | null;
  servicio_2_id: string | null;
  servicio_3_id: string | null;
  servicio_4_id: string | null;
};

// ─────────────────────────────────────────────
// Booking result (discriminated union)
// ─────────────────────────────────────────────

export type BookingRejectionCode =
  | 'TIMING_RESERVA'
  | 'TIMING_CANCELACION'
  | 'USUARIO_INACTIVO'
  /** @deprecated Use SERVICIO_REQUERIDO instead */
  | 'PLAN_REQUERIDO'
  /** @deprecated Use SERVICIO_REQUERIDO instead */
  | 'DISCIPLINA_REQUERIDA'
  | 'NIVEL_INSUFICIENTE'
  | 'CLASES_AGOTADAS'
  | 'UNIDADES_AGOTADAS'
  | 'SERVICIO_REQUERIDO'
  | 'ENTRENAMIENTO_PASADO'
  | 'ADMIN_CONFIRM_NO_UNITS'
  | 'FORMULARIO_CAMPOS_FALTANTES';

export type BookingRejection = {
  ok: false;
  code: BookingRejectionCode;
  message: string;
};

export type BookingResult = { ok: true } | BookingRejection;
