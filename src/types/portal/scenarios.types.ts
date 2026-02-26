export type Scenario = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  ubicacion: string | null;
  direccion: string | null;
  coordenadas: string | null;
  capacidad: number | null;
  tipo: string;
  activo: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ScenarioSchedule = {
  id: string;
  tenant_id: string;
  escenario_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  created_at: string;
};

export type ScenarioAvailability = {
  activo: boolean;
  hasAvailableSchedule: boolean;
};

export type ScenarioWithAvailability = Scenario & {
  schedules: ScenarioSchedule[];
  availability: ScenarioAvailability;
};

export type ScenarioScheduleInput = {
  id?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
};

export type CreateScenarioInput = {
  tenantId: string;
  nombre: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  direccion?: string | null;
  coordenadas?: string | null;
  capacidad?: number | null;
  tipo: string;
  activo?: boolean;
  image_url?: string | null;
};

export type UpdateScenarioInput = {
  tenantId: string;
  nombre: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  direccion?: string | null;
  coordenadas?: string | null;
  capacidad?: number | null;
  tipo: string;
  activo?: boolean;
  image_url?: string | null;
};

export type UpsertScenarioSchedulesInput = {
  schedules: ScenarioScheduleInput[];
};

export type ScenarioScheduleFormValue = {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
};

export type ScenarioFormValues = {
  nombre: string;
  descripcion: string;
  ubicacion: string;
  direccion: string;
  coordenadas: string;
  capacidad: string;
  tipo: string;
  activo: boolean;
  image_url: string;
  schedules: ScenarioScheduleFormValue[];
};

export type ScenarioFormField =
  | 'nombre'
  | 'descripcion'
  | 'ubicacion'
  | 'direccion'
  | 'coordenadas'
  | 'capacidad'
  | 'tipo'
  | 'image_url';

export type ScenarioScheduleField = 'dia_semana' | 'hora_inicio' | 'hora_fin';

export type ScenarioFieldErrors = Partial<Record<ScenarioFormField, string>>;

export type ScenarioScheduleFieldErrors = Array<Partial<Record<ScenarioScheduleField, string>>>;

export type ScenarioValidationError = {
  field: ScenarioFormField | ScenarioScheduleField;
  message: string;
  scheduleIndex?: number;
};

export type ScenarioValidationState = {
  fieldErrors: ScenarioFieldErrors;
  scheduleErrors: ScenarioScheduleFieldErrors;
  errors: ScenarioValidationError[];
};

export type ScenariosViewModel = {
  scenarios: ScenarioWithAvailability[];
  filteredScenarios: ScenarioWithAvailability[];
  loading: boolean;
  error: string | null;
  modalOpen: boolean;
  modalMode: 'create' | 'edit';
  selectedScenario: ScenarioWithAvailability | null;
  submitError: string | null;
  successMessage: string | null;
};
