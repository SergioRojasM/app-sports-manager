import { createClient } from '@/services/supabase/client';
import type { UsuarioNivelDisciplina, UsuarioNivelDisciplinaInput } from '@/types/portal/equipo.types';

function mapPostgrestError(error: { code?: string } | null): Error {
  if (error?.code === '42501') {
    return new Error('No tienes permisos para realizar esta acción.');
  }
  return new Error('No fue posible completar la operación de asignación de nivel.');
}

export const usuarioNivelDisciplinaService = {
  async getUsuarioNivelesDisciplina(
    usuarioId: string,
    tenantId: string,
  ): Promise<UsuarioNivelDisciplina[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('usuario_nivel_disciplina')
      .select('id, usuario_id, tenant_id, disciplina_id, nivel_id, asignado_por, created_at, updated_at')
      .eq('usuario_id', usuarioId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw mapPostgrestError(error);
    }

    return (data ?? []) as UsuarioNivelDisciplina[];
  },

  async upsertUsuarioNivelDisciplina(input: UsuarioNivelDisciplinaInput): Promise<UsuarioNivelDisciplina> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No autenticado.');
    }

    const { data, error } = await supabase
      .from('usuario_nivel_disciplina')
      .upsert(
        {
          usuario_id: input.usuario_id,
          tenant_id: input.tenant_id,
          disciplina_id: input.disciplina_id,
          nivel_id: input.nivel_id,
          asignado_por: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'usuario_id,tenant_id,disciplina_id' },
      )
      .select('id, usuario_id, tenant_id, disciplina_id, nivel_id, asignado_por, created_at, updated_at')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    return data as UsuarioNivelDisciplina;
  },
};
