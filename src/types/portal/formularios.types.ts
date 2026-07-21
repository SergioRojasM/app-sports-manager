// =============================================
// FormularioPlantilla entity types
// =============================================

export type FormularioTipoCampo = 'fecha' | 'texto_corto' | 'texto_largo' | 'numerico' | 'imagen' | 'lista';

export const FORMULARIO_TIPOS_CAMPO: readonly FormularioTipoCampo[] = [
  'fecha',
  'texto_corto',
  'texto_largo',
  'numerico',
  'imagen',
  'lista',
] as const;

export const FORMULARIO_TIPO_CAMPO_LABELS: Record<FormularioTipoCampo, string> = {
  fecha: 'Fecha',
  texto_corto: 'Texto corto',
  texto_largo: 'Texto largo',
  numerico: 'Numérico',
  imagen: 'Imagen',
  lista: 'Lista',
};

export type FormularioPlantilla = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FormularioCampo = {
  id: string;
  formulario_plantilla_id: string;
  campo_etiqueta: string;
  campo_nombre: string;
  campo_tipo: FormularioTipoCampo;
  campo_lista_valores: string | null;
  campo_obligatorio: boolean;
  campo_placeholder: string | null;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type FormularioPlantillaConCampos = FormularioPlantilla & {
  campos: FormularioCampo[];
};

/** List-row shape: plantilla metadata plus its field count (for the table's "Campos" column). */
export type FormularioPlantillaListItem = FormularioPlantilla & {
  camposCount: number;
};

// =============================================
// Input types
// =============================================

export type CreatePlantillaInput = {
  tenant_id: string;
  nombre: string;
  descripcion?: string | null;
  created_by?: string | null;
};

export type UpdatePlantillaInput = {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type CreateCampoInput = {
  formulario_plantilla_id: string;
  campo_etiqueta: string;
  campo_nombre: string;
  campo_tipo: FormularioTipoCampo;
  campo_lista_valores?: string | null;
  campo_obligatorio?: boolean;
  campo_placeholder?: string | null;
  orden: number;
};

export type UpdateCampoInput = {
  campo_etiqueta?: string;
  campo_nombre?: string;
  campo_tipo?: FormularioTipoCampo;
  campo_lista_valores?: string | null;
  campo_obligatorio?: boolean;
  campo_placeholder?: string | null;
  orden?: number;
  activo?: boolean;
};

// =============================================
// Form state types
// =============================================

export type FormularioPlantillaFormValues = {
  nombre: string;
  descripcion: string;
  activo: boolean;
};

export type FormularioPlantillaFormField = 'nombre' | 'descripcion';

export type FormularioPlantillaFieldErrors = Partial<Record<FormularioPlantillaFormField, string>>;

export type FormularioCampoFormValues = {
  campo_etiqueta: string;
  campo_nombre: string;
  campo_tipo: FormularioTipoCampo;
  campo_lista_valores: string;
  campo_obligatorio: boolean;
  orden: string;
};

export type FormularioCampoFormField = 'campo_etiqueta' | 'campo_nombre' | 'campo_tipo' | 'campo_lista_valores' | 'orden';

export type FormularioCampoFieldErrors = Partial<Record<FormularioCampoFormField, string>>;

// =============================================
// Service error
// =============================================

export type FormularioServiceErrorCode =
  | 'duplicate_nombre'
  | 'duplicate_campo_nombre'
  | 'fk_dependency'
  | 'forbidden'
  | 'unknown';

export class FormularioServiceError extends Error {
  constructor(
    public readonly code: FormularioServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FormularioServiceError';
  }
}
