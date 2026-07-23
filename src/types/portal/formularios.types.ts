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

export type FormularioSeccionTipo = 'titulo' | 'subtitulo' | 'texto' | 'datos';

export const FORMULARIO_SECCION_TIPOS: readonly FormularioSeccionTipo[] = [
  'titulo',
  'subtitulo',
  'texto',
  'datos',
] as const;

export const FORMULARIO_SECCION_TIPO_LABELS: Record<FormularioSeccionTipo, string> = {
  titulo: 'Título',
  subtitulo: 'Subtítulo',
  texto: 'Texto',
  datos: 'Datos',
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

export type FormularioSeccion = {
  id: string;
  formulario_plantilla_id: string;
  seccion_tipo: FormularioSeccionTipo;
  seccion_descripcion: string | null;
  campo_etiqueta: string | null;
  campo_nombre: string | null;
  campo_tipo: FormularioTipoCampo | null;
  campo_lista_valores: string | null;
  campo_obligatorio: boolean;
  campo_placeholder: string | null;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type FormularioPlantillaConSecciones = FormularioPlantilla & {
  secciones: FormularioSeccion[];
};

/** List-row shape: plantilla metadata plus its section count (for the table's "Secciones" column). */
export type FormularioPlantillaListItem = FormularioPlantilla & {
  seccionesCount: number;
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

export type CreateSeccionInput = {
  formulario_plantilla_id: string;
  seccion_tipo: FormularioSeccionTipo;
  seccion_descripcion?: string | null;
  campo_etiqueta?: string;
  campo_nombre?: string;
  campo_tipo?: FormularioTipoCampo;
  campo_lista_valores?: string | null;
  campo_obligatorio?: boolean;
  campo_placeholder?: string | null;
  orden: number;
};

export type UpdateSeccionInput = {
  seccion_tipo?: FormularioSeccionTipo;
  seccion_descripcion?: string | null;
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
};

export type FormularioPlantillaFormField = 'nombre' | 'descripcion';

export type FormularioPlantillaFieldErrors = Partial<Record<FormularioPlantillaFormField, string>>;

export type FormularioSeccionFormValues = {
  seccion_tipo: FormularioSeccionTipo;
  seccion_descripcion: string;
  campo_etiqueta: string;
  campo_tipo: FormularioTipoCampo;
  campo_lista_valores: string;
  campo_placeholder: string;
  campo_obligatorio: boolean;
};

export type FormularioSeccionFormField =
  | 'seccion_descripcion'
  | 'campo_etiqueta'
  | 'campo_tipo'
  | 'campo_lista_valores';

export type FormularioSeccionFieldErrors = Partial<Record<FormularioSeccionFormField, string>>;

// =============================================
// Formulario respuesta (US-0087)
// =============================================

/** Label/type/order snapshot for one "datos" field, taken at submission time. */
export type FormularioRespuestaCampoSnapshot = {
  etiqueta: string;
  tipo: FormularioTipoCampo;
  orden: number;
};

export type FormularioRespuesta = {
  id: string;
  tenant_id: string;
  /** Null once the template has been deleted (on delete set null) — the response itself is never deleted. */
  formulario_plantilla_id: string | null;
  atleta_id: string;
  entrenamiento_id: string;
  respuesta: Record<string, string>;
  /** Keyed by campo_nombre; survives template edits/deletion so answers stay readable. */
  campos_snapshot: Record<string, FormularioRespuestaCampoSnapshot>;
  created_at: string;
};

// =============================================
// Service error
// =============================================

export type FormularioServiceErrorCode =
  | 'duplicate_nombre'
  | 'duplicate_campo_nombre'
  | 'fk_dependency'
  | 'forbidden'
  | 'invalid_seccion'
  /** Deleting a plantilla still referenced by one or more trainings' formulario_id. */
  | 'in_use'
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
