export type Plan = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  vigencia_meses: number;
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
  activo?: boolean;
  disciplinaIds: string[];
};

export type UpdatePlanInput = CreatePlanInput & {
  planId: string;
};

export type PlanFormValues = {
  nombre: string;
  descripcion: string;
  precio: string;         // string for controlled input, parsed on submit
  vigencia_meses: string; // string for controlled input
  activo: boolean;
  disciplinaIds: string[];
};

export type PlanFormField = 'nombre' | 'descripcion' | 'precio' | 'vigencia_meses' | 'disciplinaIds';
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
