export type NivelDisciplina = {
  id: string;
  tenant_id: string;
  disciplina_id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
};

export type CreateNivelDisciplinaInput = {
  tenantId: string;
  disciplinaId: string;
  nombre: string;
  orden: number;
  activo?: boolean;
};

export type UpdateNivelDisciplinaInput = {
  nombre?: string;
  orden?: number;
  activo?: boolean;
};

export type NivelDisciplinaFormValues = {
  nombre: string;
  orden: string;
  activo: boolean;
};

export type NivelDisciplinaFormField = 'nombre' | 'orden';

export type NivelDisciplinaFieldErrors = Partial<Record<NivelDisciplinaFormField, string>>;

export type NivelDisciplinaServiceErrorCode =
  | 'duplicate_name'
  | 'duplicate_orden'
  | 'fk_dependency'
  | 'forbidden'
  | 'unknown';

export class NivelDisciplinaServiceError extends Error {
  code: NivelDisciplinaServiceErrorCode;

  constructor(code: NivelDisciplinaServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'NivelDisciplinaServiceError';
  }
}
