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
  perfil_campos_requeridos: FormularioPerfilCampo[];
};

// =============================================
// Profile data requirements (US-0095)
// =============================================

/**
 * Fixed catalog of profile fields a form template can request from the athlete's
 * profile instead of re-declaring them as custom "Datos" sections.
 * `tipo_identificacion` represents BOTH `usuarios.tipo_identificacion` and
 * `usuarios.numero_identificacion` — one is meaningless without the other.
 */
export type FormularioPerfilCampo =
  | 'nombre'
  | 'apellido'
  | 'telefono'
  | 'fecha_nacimiento'
  | 'tipo_identificacion'
  | 'fecha_exp_identificacion'
  | 'rh'
  | 'peso_kg'
  | 'altura_cm';

export type FormularioPerfilCampoSource = 'usuarios' | 'perfil_deportivo';

export type FormularioPerfilCampoDef = {
  key: FormularioPerfilCampo;
  label: string;
  source: FormularioPerfilCampoSource;
  /** "Datos personales" or "Datos deportivos" grouping for the checkbox grid UI. */
  grupo: 'personal' | 'deportivo';
};

export const FORMULARIO_PERFIL_CAMPOS: readonly FormularioPerfilCampoDef[] = [
  { key: 'nombre', label: 'Nombre', source: 'usuarios', grupo: 'personal' },
  { key: 'apellido', label: 'Apellido', source: 'usuarios', grupo: 'personal' },
  { key: 'telefono', label: 'Teléfono', source: 'usuarios', grupo: 'personal' },
  { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', source: 'usuarios', grupo: 'personal' },
  { key: 'tipo_identificacion', label: 'Identificación (tipo y número)', source: 'usuarios', grupo: 'personal' },
  { key: 'fecha_exp_identificacion', label: 'Fecha de expedición de identificación', source: 'usuarios', grupo: 'personal' },
  { key: 'rh', label: 'RH', source: 'usuarios', grupo: 'personal' },
  { key: 'peso_kg', label: 'Peso (kg)', source: 'perfil_deportivo', grupo: 'deportivo' },
  { key: 'altura_cm', label: 'Altura (cm)', source: 'perfil_deportivo', grupo: 'deportivo' },
] as const;

export const FORMULARIO_PERFIL_CAMPO_LABELS: Record<FormularioPerfilCampo, string> = Object.fromEntries(
  FORMULARIO_PERFIL_CAMPOS.map((c) => [c.key, c.label]),
) as Record<FormularioPerfilCampo, string>;

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
  perfil_campos_requeridos?: FormularioPerfilCampo[];
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
  /** Requested profile field values (US-0095's perfil_campos_requeridos) frozen at submission time; survives later profile edits (US-0096). */
  perfil_snapshot: Partial<Record<FormularioPerfilCampo, string>>;
};

/** One row of the "Descargar Respuestas Formulario" export — a response plus its athlete's identity. */
export type FormularioRespuestaReportRow = FormularioRespuesta & {
  atleta_nombre: string | null;
  atleta_apellido: string | null;
  atleta_email: string;
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
