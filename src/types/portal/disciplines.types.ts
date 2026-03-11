import type { NivelDisciplina } from './nivel-disciplina.types';

export type Discipline = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type DisciplineStatus = 'active' | 'inactive';

export type DisciplineTableItem = Discipline & {
  categoria: string;
  statusLabel: string;
  status: DisciplineStatus;
};

export type CreateDisciplineInput = {
  tenantId: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type UpdateDisciplineInput = {
  tenantId: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type DisciplineFormValues = {
  nombre: string;
  descripcion: string;
  activo: boolean;
};

export type DisciplineFormField = 'nombre' | 'descripcion';

export type DisciplineFieldErrors = Partial<Record<DisciplineFormField, string>>;

export type DisciplinesViewModel = {
  disciplines: Discipline[];
  filteredDisciplines: DisciplineTableItem[];
  loading: boolean;
  error: string | null;
  modalOpen: boolean;
  modalMode: 'create' | 'edit';
  selectedDiscipline: Discipline | null;
  submitError: string | null;
  successMessage: string | null;
};

export type DisciplineServiceErrorCode =
  | 'duplicate_name'
  | 'fk_dependency'
  | 'forbidden'
  | 'unknown';

export class DisciplineServiceError extends Error {
  code: DisciplineServiceErrorCode;

  constructor(code: DisciplineServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'DisciplineServiceError';
  }
}

export type DisciplineWithNiveles = Discipline & {
  niveles: NivelDisciplina[];
};

export type NivelDisciplinaCount = {
  disciplina_id: string;
  total: number;
  activos: number;
};