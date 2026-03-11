import { createClient } from '@/services/supabase/client';
import type {
  EntrenamientoGrupoCategoria,
  EntrenamientoCategoria,
  EntrenamientoCategoriaInput,
} from '@/types/portal/entrenamiento-categorias.types';

function mapPostgrestError(error: { code?: string } | null): Error {
  if (error?.code === '42501') {
    return new Error('No tienes permisos para realizar esta acción.');
  }
  return new Error('No fue posible completar la operación de categorías.');
}

export const entrenamientoCategoriasService = {
  async getGrupoCategorias(grupoId: string): Promise<EntrenamientoGrupoCategoria[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamiento_grupo_categorias')
      .select('id, grupo_id, nivel_id, cupos_asignados, created_at')
      .eq('grupo_id', grupoId);

    if (error) {
      throw mapPostgrestError(error);
    }

    return (data ?? []) as EntrenamientoGrupoCategoria[];
  },

  async getEntrenamientoCategorias(entrenamientoId: string): Promise<EntrenamientoCategoria[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamiento_categorias')
      .select('id, entrenamiento_id, nivel_id, cupos_asignados, sincronizado_grupo, created_at')
      .eq('entrenamiento_id', entrenamientoId);

    if (error) {
      throw mapPostgrestError(error);
    }

    return (data ?? []) as EntrenamientoCategoria[];
  },

  async upsertGrupoCategorias(
    grupoId: string,
    categorias: EntrenamientoCategoriaInput[],
  ): Promise<EntrenamientoGrupoCategoria[]> {
    const supabase = createClient();

    // Delete existing rows for this group then insert new ones
    const { error: delError } = await supabase
      .from('entrenamiento_grupo_categorias')
      .delete()
      .eq('grupo_id', grupoId);

    if (delError) {
      throw mapPostgrestError(delError);
    }

    if (categorias.length === 0) return [];

    const rows = categorias.map((c) => ({
      grupo_id: grupoId,
      nivel_id: c.nivel_id,
      cupos_asignados: c.cupos_asignados,
    }));

    const { data, error } = await supabase
      .from('entrenamiento_grupo_categorias')
      .insert(rows)
      .select('id, grupo_id, nivel_id, cupos_asignados, created_at');

    if (error) {
      throw mapPostgrestError(error);
    }

    return (data ?? []) as EntrenamientoGrupoCategoria[];
  },

  async upsertInstanceCategorias(
    entrenamientoId: string,
    categorias: EntrenamientoCategoriaInput[],
    sincronizadoGrupo: boolean,
  ): Promise<EntrenamientoCategoria[]> {
    const supabase = createClient();

    // Delete existing rows for this instance then insert new ones
    const { error: delError } = await supabase
      .from('entrenamiento_categorias')
      .delete()
      .eq('entrenamiento_id', entrenamientoId);

    if (delError) {
      throw mapPostgrestError(delError);
    }

    if (categorias.length === 0) return [];

    const rows = categorias.map((c) => ({
      entrenamiento_id: entrenamientoId,
      nivel_id: c.nivel_id,
      cupos_asignados: c.cupos_asignados,
      sincronizado_grupo: sincronizadoGrupo,
    }));

    const { data, error } = await supabase
      .from('entrenamiento_categorias')
      .insert(rows)
      .select('id, entrenamiento_id, nivel_id, cupos_asignados, sincronizado_grupo, created_at');

    if (error) {
      throw mapPostgrestError(error);
    }

    return (data ?? []) as EntrenamientoCategoria[];
  },

  async deleteGrupoCategorias(grupoId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('entrenamiento_grupo_categorias')
      .delete()
      .eq('grupo_id', grupoId);

    if (error) {
      throw mapPostgrestError(error);
    }
  },

  async deleteInstanceCategorias(entrenamientoId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('entrenamiento_categorias')
      .delete()
      .eq('entrenamiento_id', entrenamientoId);

    if (error) {
      throw mapPostgrestError(error);
    }
  },
};
