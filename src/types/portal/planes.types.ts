export type PlanModalidad = 'virtual' | 'presencial' | 'mixto';

// --- Plan Tipo (subtype) entity types ---

export type PlanTipo = {
  id: string;
  plan_id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  vigencia_dias: number;
  clases_incluidas: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatePlanTipoInput = {
  plan_id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  vigencia_dias: number;
  clases_incluidas: number;
  activo?: boolean;
};

export type UpdatePlanTipoInput = {
  nombre?: string;
  descripcion?: string | null;
  precio?: number;
  vigencia_dias?: number;
  clases_incluidas?: number;
  activo?: boolean;
};

export type PlanTipoFormValues = {
  nombre: string;
  descripcion: string;
  precio: string;           // string for controlled input
  vigencia_dias: string;    // string for controlled input
  clases_incluidas: string; // string for controlled input
  activo: boolean;
};

// --- Plan entity types ---

export type Plan = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  vigencia_meses: number;
  clases_incluidas: number | null;
  tipo: PlanModalidad | null;
  beneficios: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type PlanDisciplina = {
  id: string;
  plan_id: string;
  disciplina_id: string;
  created_at: string;
};

export type PlanWithDisciplinas = Plan & {
  disciplinas: string[]; // array of disciplina IDs associated with this plan
  plan_tipos?: PlanTipo[];
};

export type PlanTableItem = PlanWithDisciplinas & {
  statusLabel: string;
  vigenciaLabel: string;       // e.g. "3 meses"
  disciplinaNames: string[];   // resolved discipline names for display
};

export type CreatePlanInput = {
  tenantId: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  vigencia_meses: number;
  clases_incluidas?: number | null;
  tipo?: PlanModalidad | null;
  beneficios?: string | null;
  activo?: boolean;
  disciplinaIds: string[];
};

export type UpdatePlanInput = CreatePlanInput & {
  planId: string;
};

export type PlanFormValues = {
  nombre: string;
  descripcion: string;
  precio: string;           // string for controlled input, parsed on submit
  vigencia_meses: string;   // string for controlled input
  clases_incluidas: string; // string for controlled input
  tipo: PlanModalidad | '';       // '' = not selected
  beneficios: string[];     // each item is one benefit text; stored concatenated with '|'
  activo: boolean;
  disciplinaIds: string[];
};

export type PlanFormField = 'nombre' | 'descripcion' | 'precio' | 'vigencia_meses' | 'clases_incluidas' | 'tipo' | 'beneficios' | 'disciplinaIds';
export type PlanFieldErrors = Partial<Record<PlanFormField, string>>;

export type PlanesViewModel = {
  planes: PlanWithDisciplinas[];
  filteredPlanes: PlanTableItem[];
  loading: boolean;
  error: string | null;
  modalOpen: boolean;
  modalMode: 'create' | 'edit';
  selectedPlan: PlanWithDisciplinas | null;
  submitError: string | null;
  successMessage: string | null;
};

export type PlanServiceErrorCode =
  | 'duplicate_name'
  | 'fk_dependency'
  | 'forbidden'
  | 'unknown';

export class PlanServiceError extends Error {
  code: PlanServiceErrorCode;

  constructor(code: PlanServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'PlanServiceError';
  }
}
