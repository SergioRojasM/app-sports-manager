import { createClient } from '@/services/supabase/client';
import {
  NivelDisciplinaServiceError,
  type NivelDisciplina,
  type CreateNivelDisciplinaInput,
  type UpdateNivelDisciplinaInput,
} from '@/types/portal/nivel-disciplina.types';

function mapPostgrestError(error: { code?: string; constraint?: string } | null): NivelDisciplinaServiceError {
  if (!error) {
    return new NivelDisciplinaServiceError('unknown', 'No fue posible completar la operación de niveles.');
  }

  if (error.code === '23505' && error.constraint === 'uq_nivel_disciplina_nombre') {
    return new NivelDisciplinaServiceError('duplicate_name', 'Ya existe un nivel con ese nombre para esta disciplina.');
  }

  if (error.code === '23505' && error.constraint === 'uq_nivel_disciplina_orden') {
    return new NivelDisciplinaServiceError('duplicate_orden', 'Ya existe un nivel con ese orden para esta disciplina.');
  }

  if (error.code === '23503') {
    return new NivelDisciplinaServiceError('fk_dependency', 'No se puede eliminar el nivel porque está en uso por atletas o entrenamientos.');
  }

  if (error.code === '42501') {
    return new NivelDisciplinaServiceError('forbidden', 'No tienes permisos para realizar esta acción.');
  }

  return new NivelDisciplinaServiceError('unknown', 'No fue posible completar la operación de niveles.');
}

export const nivelDisciplinaService = {
  async getNivelesDisciplina(tenantId: string, disciplinaId: string): Promise<NivelDisciplina[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('nivel_disciplina')
      .select('id, tenant_id, disciplina_id, nombre, orden, activo, created_at')
      .eq('tenant_id', tenantId)
      .eq('disciplina_id', disciplinaId)
      .order('orden', { ascending: true });

    if (error) {
      throw mapPostgrestError(error);
    }

    return (data ?? []) as NivelDisciplina[];
  },

  async createNivelDisciplina(input: CreateNivelDisciplinaInput): Promise<NivelDisciplina> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('nivel_disciplina')
      .insert({
        tenant_id: input.tenantId,
        disciplina_id: input.disciplinaId,
        nombre: input.nombre.trim(),
        orden: input.orden,
        activo: input.activo ?? true,
      })
      .select('id, tenant_id, disciplina_id, nombre, orden, activo, created_at')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    return data as NivelDisciplina;
  },

  async updateNivelDisciplina(id: string, input: UpdateNivelDisciplinaInput): Promise<NivelDisciplina> {
    const supabase = createClient();

    const patch: Record<string, unknown> = {};
    if (input.nombre !== undefined) patch.nombre = input.nombre.trim();
    if (input.orden !== undefined) patch.orden = input.orden;
    if (input.activo !== undefined) patch.activo = input.activo;

    const { data, error } = await supabase
      .from('nivel_disciplina')
      .update(patch)
      .eq('id', id)
      .select('id, tenant_id, disciplina_id, nombre, orden, activo, created_at')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    return data as NivelDisciplina;
  },

  async deleteNivelDisciplina(id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('nivel_disciplina')
      .delete()
      .eq('id', id);

    if (error) {
      throw mapPostgrestError(error);
    }
  },
};
