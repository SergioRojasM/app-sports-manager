import type { EntrenamientoCategoriaInput, EntrenamientoGrupoCategoria, EntrenamientoCategoria } from './entrenamiento-categorias.types';

export type { EntrenamientoGrupoCategoria, EntrenamientoCategoria };

export type TrainingType = 'unico' | 'recurrente';
export type TrainingScope = 'single' | 'future' | 'series';
export type TrainingVisibility = 'publico' | 'privado';

export type TrainingGroupStatus = 'activo' | 'cancelado' | 'finalizado';
export type TrainingInstanceStatus = 'pendiente' | 'confirmado' | 'cancelado' | string;

export type TrainingGroup = {
  id: string;
  tenant_id: string;
  tipo: TrainingType;
  nombre: string;
  descripcion: string | null;
  punto_encuentro: string | null;
  disciplina_id: string;
  escenario_id: string;
  entrenador_id: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  timezone: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: TrainingGroupStatus;
  categorias?: EntrenamientoGrupoCategoria[];
  created_at: string;
  updated_at: string;
};

export type TrainingGroupRule = {
  id: string;
  tenant_id: string;
  entrenamiento_grupo_id: string;
  dias_semana: number[];
  repetir_cada_semanas: number;
  tipo_bloque: 'una_vez_dia' | 'franja_repeticion' | 'horas_especificas';
  hora_inicio: string | null;
  hora_fin: string | null;
  horas_especificas: string[] | null;
  created_at: string;
  updated_at: string;
};

export type TrainingInstance = {
  id: string;
  tenant_id: string;
  entrenamiento_grupo_id: string | null;
  origen_creacion: 'manual' | 'generado';
  es_excepcion_serie: boolean;
  bloquear_sync_grupo: boolean;
  nombre: string;
  descripcion: string | null;
  punto_encuentro: string | null;
  disciplina_id: string;
  escenario_id: string;
  entrenador_id: string | null;
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  visibilidad: TrainingVisibility;
  visible_para: string | null;
  estado: TrainingInstanceStatus;
  reservas_activas?: number;
  categorias?: EntrenamientoCategoria[];
  created_at: string;
  updated_at: string;
};

export type TrainingGroupWithDetails = TrainingGroup & {
  reglas: TrainingGroupRule[];
  instancesCount: number;
};

export type TrainingCalendarItem = {
  instance: TrainingInstance;
  groupName: string;
  startsAtLabel: string;
  durationLabel: string;
};

export type SelectOption = {
  id: string;
  label: string;
};

export type TrainingWizardRuleFormValue = {
  tipo_bloque: 'una_vez_dia' | 'franja_repeticion' | 'horas_especificas';
  hora_inicio: string;
  hora_fin: string;
  horas_especificas: string[];
};

export type TrainingWizardValues = {
  nombre: string;
  descripcion: string;
  punto_encuentro: string;
  disciplina_id: string;
  escenario_id: string;
  entrenador_id: string;
  duracion_minutos: string;
  cupo_maximo: string;
  visibilidad: TrainingVisibility;
  tipo: TrainingType;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_hora_unico: string;
  dias_semana: string[];
  repetir_cada_semanas: string;
  reglas: TrainingWizardRuleFormValue[];
};

export type TrainingField =
  | 'nombre'
  | 'disciplina_id'
  | 'escenario_id'
  | 'entrenador_id'
  | 'duracion_minutos'
  | 'cupo_maximo'
  | 'visibilidad'
  | 'tipo'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'fecha_hora_unico'
  | 'dias_semana'
  | 'repetir_cada_semanas'
  | 'descripcion'
  | 'punto_encuentro';

export type TrainingRuleField = 'tipo_bloque' | 'hora_inicio' | 'hora_fin' | 'horas_especificas';

export type TrainingFieldErrors = Partial<Record<TrainingField, string>>;
export type TrainingRuleErrors = Array<Partial<Record<TrainingRuleField, string>>>;

export type TrainingScopeContext = {
  action: 'edit' | 'delete';
  source: 'group' | 'instance';
  trainingGroupId?: string;
  trainingId?: string;
  effectiveFrom?: string | null;
  allowedScopes: TrainingScope[];
};

export type TrainingScopeSelection = {
  open: boolean;
  context: TrainingScopeContext | null;
};

export type CreateTrainingSeriesInput = {
  tenantId: string;
  visibilidad: TrainingVisibility;
  uniqueDateTime?: string | null;
  group: {
    tipo: TrainingType;
    nombre: string;
    descripcion?: string | null;
    punto_encuentro?: string | null;
    disciplina_id: string;
    escenario_id: string;
    entrenador_id?: string | null;
    duracion_minutos?: number | null;
    cupo_maximo?: number | null;
    timezone?: string;
    fecha_inicio: string;
    fecha_fin?: string | null;
    estado?: TrainingGroupStatus;
  };
  rules: Array<{
    dias_semana: number[];
    repetir_cada_semanas: number;
    tipo_bloque: 'una_vez_dia' | 'franja_repeticion' | 'horas_especificas';
    hora_inicio?: string | null;
    hora_fin?: string | null;
    horas_especificas?: string[] | null;
  }>;
  categorias?: EntrenamientoCategoriaInput[];
};

export type UpsertTrainingGroupRulesInput = {
  tenantId: string;
  trainingGroupId: string;
  rules: Array<{
    id?: string;
    dias_semana: number[];
    repetir_cada_semanas: number;
    tipo_bloque: 'una_vez_dia' | 'franja_repeticion' | 'horas_especificas';
    hora_inicio?: string | null;
    hora_fin?: string | null;
    horas_especificas?: string[] | null;
  }>;
};

export type GenerateSeriesInstancesInput = {
  tenantId: string;
  visibilidad?: TrainingVisibility;
  trainingGroup: TrainingGroup;
  rules: TrainingGroupRule[];
  fromDate?: string;
  toDate?: string | null;
  uniqueDateTime?: string | null;
};

export type UpdateTrainingSeriesInput = {
  tenantId: string;
  trainingGroupId: string;
  scope: Extract<TrainingScope, 'future' | 'series'>;
  visibilidad?: TrainingVisibility;
  effectiveFrom?: string;
  groupPatch: Partial<{
    nombre: string;
    descripcion: string | null;
    punto_encuentro: string | null;
    disciplina_id: string;
    escenario_id: string;
    entrenador_id: string | null;
    duracion_minutos: number | null;
    cupo_maximo: number | null;
    fecha_inicio: string;
    fecha_fin: string | null;
    estado: TrainingGroupStatus;
  }>;
  rules?: UpsertTrainingGroupRulesInput['rules'];
  categorias?: EntrenamientoCategoriaInput[];
};

export type UpdateTrainingInstanceInput = {
  tenantId: string;
  trainingId: string;
  scope: TrainingScope;
  visibilidad?: TrainingVisibility;
  trainingGroupId?: string;
  effectiveFrom?: string;
  patch: Partial<{
    nombre: string;
    descripcion: string | null;
    punto_encuentro: string | null;
    disciplina_id: string;
    escenario_id: string;
    entrenador_id: string | null;
    fecha_hora: string | null;
    duracion_minutos: number | null;
    cupo_maximo: number | null;
    estado: TrainingInstanceStatus;
  }>;
  categorias?: EntrenamientoCategoriaInput[];
};

export type CategoriasFormState = {
  enabled: boolean;
  items: Record<string, number>;
};

export type DeleteTrainingWithScopeInput = {
  tenantId: string;
  scope: TrainingScope;
  trainingId?: string;
  trainingGroupId?: string;
  effectiveFrom?: string;
};

export type TrainingsViewModel = {
  groups: TrainingGroupWithDetails[];
  instances: TrainingInstance[];
  calendarItems: TrainingCalendarItem[];
  loading: boolean;
  error: string | null;
  submitError: string | null;
  successMessage: string | null;
};

export type TrainingServiceErrorCode =
  | 'duplicate_name'
  | 'fk_dependency'
  | 'forbidden'
  | 'validation'
  | 'unknown';

export class TrainingServiceError extends Error {
  code: TrainingServiceErrorCode;

  constructor(code: TrainingServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'TrainingServiceError';
  }
}
