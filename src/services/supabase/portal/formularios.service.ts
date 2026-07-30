import { createClient } from '@/services/supabase/client';
import {
  FormularioServiceError,
  type FormularioPlantilla,
  type FormularioPlantillaConSecciones,
  type FormularioPlantillaListItem,
  type FormularioSeccion,
  type FormularioRespuesta,
  type FormularioRespuestaReportRow,
  type CreatePlantillaInput,
  type UpdatePlantillaInput,
  type CreateSeccionInput,
  type UpdateSeccionInput,
} from '@/types/portal/formularios.types';

type PostgrestError = { code?: string; message?: string };

function mapFormularioError(error: PostgrestError | null): FormularioServiceError {
  if (!error) {
    return new FormularioServiceError('unknown', 'No fue posible completar la operación.');
  }

  // PostgREST doesn't expose a top-level `constraint` field — the unique-constraint
  // name is embedded in `message` (e.g. `duplicate key value violates unique constraint "…"`).
  if (error.code === '23505' && error.message?.includes('formularios_plantillas_tenant_nombre_uk')) {
    return new FormularioServiceError('duplicate_nombre', 'Ya existe una plantilla con este nombre.');
  }

  if (error.code === '23505' && error.message?.includes('formulario_plantilla_esquema_plantilla_nombre_uk')) {
    return new FormularioServiceError('duplicate_campo_nombre', 'Ya existe un campo con este nombre interno en la plantilla.');
  }

  if (error.code === '23505') {
    return new FormularioServiceError('duplicate_nombre', 'Ya existe un registro con estos datos.');
  }

  if (error.code === '23503') {
    return new FormularioServiceError('fk_dependency', 'Este registro está en uso y no puede eliminarse.');
  }

  if (error.code === '42501') {
    return new FormularioServiceError('forbidden', 'No tienes permisos para realizar esta acción.');
  }

  // Deleting a plantilla still marked "obligatorio" on a training: the ON DELETE SET NULL
  // on entrenamientos(_grupo).formulario_id nulls the FK, but that then violates the
  // sibling *_formulario_obligatorio_ck check constraint (US-0086) — surface a clear,
  // specific message instead of falling into the generic "invalid_seccion" branch below.
  if (error.code === '23514' && error.message?.includes('formulario_obligatorio_ck')) {
    return new FormularioServiceError('in_use', 'Esta plantilla está siendo usada en algún entrenamiento.');
  }

  if (error.code === '23514') {
    return new FormularioServiceError('invalid_seccion', 'Completa los datos requeridos para esta sección.');
  }

  return new FormularioServiceError('unknown', 'No fue posible completar la operación.');
}

/** Builds the full conditional column set for a section, based on its `seccion_tipo`. */
function buildSeccionColumns(input: CreateSeccionInput | (UpdateSeccionInput & { seccion_tipo: NonNullable<UpdateSeccionInput['seccion_tipo']> })) {
  if (input.seccion_tipo === 'datos') {
    return {
      seccion_tipo: input.seccion_tipo,
      seccion_descripcion: null,
      campo_etiqueta: input.campo_etiqueta?.trim() ?? null,
      campo_nombre: input.campo_nombre?.trim() ?? null,
      campo_tipo: input.campo_tipo ?? null,
      campo_lista_valores: input.campo_tipo === 'lista' ? input.campo_lista_valores?.trim() || null : null,
      campo_obligatorio: input.campo_obligatorio ?? false,
      campo_placeholder: input.campo_placeholder?.trim() || null,
    };
  }

  return {
    seccion_tipo: input.seccion_tipo,
    seccion_descripcion: input.seccion_descripcion?.trim() || null,
    campo_etiqueta: null,
    campo_nombre: null,
    campo_tipo: null,
    campo_lista_valores: null,
    campo_obligatorio: false,
    campo_placeholder: null,
  };
}

export const formulariosService = {
  // -----------------------------------------------------------------------
  // Plantillas CRUD
  // -----------------------------------------------------------------------

  async getPlantillasByTenant(tenantId: string): Promise<FormularioPlantillaListItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('formularios_plantillas')
      .select('*, formulario_plantilla_esquema(count)')
      .eq('tenant_id', tenantId)
      .order('nombre');

    if (error) throw mapFormularioError(error);

    return ((data ?? []) as unknown as Array<
      FormularioPlantilla & { formulario_plantilla_esquema: Array<{ count: number }> }
    >).map((row) => {
      const { formulario_plantilla_esquema, ...plantilla } = row;
      return {
        ...plantilla,
        seccionesCount: formulario_plantilla_esquema?.[0]?.count ?? 0,
      };
    });
  },

  async getPlantillaConSecciones(plantillaId: string): Promise<FormularioPlantillaConSecciones> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('formularios_plantillas')
      .select('*, formulario_plantilla_esquema(*)')
      .eq('id', plantillaId)
      .order('orden', { referencedTable: 'formulario_plantilla_esquema', ascending: true })
      .single();

    if (error || !data) throw mapFormularioError(error);

    const { formulario_plantilla_esquema, ...plantilla } = data as FormularioPlantilla & {
      formulario_plantilla_esquema: FormularioSeccion[];
    };

    return {
      ...(plantilla as FormularioPlantilla),
      secciones: formulario_plantilla_esquema ?? [],
    };
  },

  async createPlantilla(input: CreatePlantillaInput): Promise<FormularioPlantilla> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('formularios_plantillas')
      .insert({
        tenant_id: input.tenant_id,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        created_by: input.created_by ?? null,
      })
      .select('*')
      .single();

    if (error || !data) throw mapFormularioError(error);
    return data as FormularioPlantilla;
  },

  async updatePlantilla(id: string, input: UpdatePlantillaInput): Promise<FormularioPlantilla> {
    const supabase = createClient();
    const payload: Record<string, unknown> = {};
    if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
    if (input.descripcion !== undefined) payload.descripcion = input.descripcion?.trim() || null;
    if (input.activo !== undefined) payload.activo = input.activo;
    if (input.perfil_campos_requeridos !== undefined) payload.perfil_campos_requeridos = input.perfil_campos_requeridos;

    const { data, error } = await supabase
      .from('formularios_plantillas')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) throw mapFormularioError(error);
    return data as FormularioPlantilla;
  },

  async deletePlantilla(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('formularios_plantillas')
      .delete()
      .eq('id', id);

    if (error) throw mapFormularioError(error);
  },

  // -----------------------------------------------------------------------
  // Secciones (esquema) CRUD
  // -----------------------------------------------------------------------

  async getSeccionesByPlantilla(plantillaId: string): Promise<FormularioSeccion[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('formulario_plantilla_esquema')
      .select('*')
      .eq('formulario_plantilla_id', plantillaId)
      .order('orden', { ascending: true });

    if (error) throw mapFormularioError(error);
    return (data ?? []) as FormularioSeccion[];
  },

  async createSeccion(input: CreateSeccionInput): Promise<FormularioSeccion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('formulario_plantilla_esquema')
      .insert({
        formulario_plantilla_id: input.formulario_plantilla_id,
        orden: input.orden,
        ...buildSeccionColumns(input),
      })
      .select('*')
      .single();

    if (error || !data) throw mapFormularioError(error);
    return data as FormularioSeccion;
  },

  async updateSeccion(id: string, input: UpdateSeccionInput): Promise<FormularioSeccion> {
    const supabase = createClient();
    const payload: Record<string, unknown> = input.seccion_tipo
      ? buildSeccionColumns({ ...input, seccion_tipo: input.seccion_tipo })
      : {};

    if (!input.seccion_tipo) {
      if (input.campo_etiqueta !== undefined) payload.campo_etiqueta = input.campo_etiqueta.trim();
      if (input.campo_nombre !== undefined) payload.campo_nombre = input.campo_nombre.trim();
      if (input.campo_tipo !== undefined) {
        payload.campo_tipo = input.campo_tipo;
        payload.campo_lista_valores = input.campo_tipo === 'lista' ? input.campo_lista_valores?.trim() || null : null;
      } else if (input.campo_lista_valores !== undefined) {
        payload.campo_lista_valores = input.campo_lista_valores?.trim() || null;
      }
      if (input.campo_obligatorio !== undefined) payload.campo_obligatorio = input.campo_obligatorio;
      if (input.campo_placeholder !== undefined) payload.campo_placeholder = input.campo_placeholder?.trim() || null;
      if (input.seccion_descripcion !== undefined) payload.seccion_descripcion = input.seccion_descripcion?.trim() || null;
    }

    if (input.orden !== undefined) payload.orden = input.orden;
    if (input.activo !== undefined) payload.activo = input.activo;

    const { data, error } = await supabase
      .from('formulario_plantilla_esquema')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) throw mapFormularioError(error);
    return data as FormularioSeccion;
  },

  async deleteSeccion(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('formulario_plantilla_esquema')
      .delete()
      .eq('id', id);

    if (error) throw mapFormularioError(error);
  },

  async reorderSecciones(_plantillaId: string, orderedIds: string[]): Promise<void> {
    const supabase = createClient();

    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await supabase
        .from('formulario_plantilla_esquema')
        .update({ orden: i })
        .eq('id', orderedIds[i]);

      if (error) throw mapFormularioError(error);
    }
  },

  // -----------------------------------------------------------------------
  // Respuestas (US-0087) — RLS-gated read: owning athlete or tenant staff
  // -----------------------------------------------------------------------

  async getRespuestaById(id: string): Promise<FormularioRespuesta | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('formulario_respuestas')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw mapFormularioError(error);
    return (data as FormularioRespuesta | null) ?? null;
  },

  /** Every response submitted for a training, regardless of its booking's current status — used by the "Descargar Respuestas Formulario" export. */
  async getRespuestasByEntrenamiento(tenantId: string, entrenamientoId: string): Promise<FormularioRespuestaReportRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('formulario_respuestas')
      .select(`
        id,
        tenant_id,
        formulario_plantilla_id,
        atleta_id,
        entrenamiento_id,
        respuesta,
        campos_snapshot,
        perfil_snapshot,
        created_at,
        usuarios!formulario_respuestas_atleta_id_fkey (
          nombre,
          apellido,
          email
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('entrenamiento_id', entrenamientoId)
      .order('created_at', { ascending: true });

    if (error) throw mapFormularioError(error);

    return (data ?? []).map((row) => {
      const usuario = row.usuarios as unknown as { nombre: string | null; apellido: string | null; email: string } | null;
      return {
        id: row.id,
        tenant_id: row.tenant_id,
        formulario_plantilla_id: row.formulario_plantilla_id,
        atleta_id: row.atleta_id,
        entrenamiento_id: row.entrenamiento_id,
        respuesta: row.respuesta,
        campos_snapshot: row.campos_snapshot,
        perfil_snapshot: row.perfil_snapshot,
        created_at: row.created_at,
        atleta_nombre: usuario?.nombre ?? null,
        atleta_apellido: usuario?.apellido ?? null,
        atleta_email: usuario?.email ?? '',
      } as FormularioRespuestaReportRow;
    });
  },
};
