import { createClient } from '@/services/supabase/client';
import type { UsuarioNivelDisciplina, UsuarioNivelDisciplinaInput } from '@/types/portal/equipo.types';

function mapPostgrestError(error: { code?: string } | null): Error {
  if (error?.code === '42501') {
    return new Error('No tienes permisos para realizar esta acción.');
  }
  return new Error('No fue posible completar la operación de asignación de nivel.');
}

/** Athletes with an assigned level, counted per discipline and per level (`fXuVP` stats and ladder). */
export type AtletasPorNivel = {
  porDisciplina: Record<string, number>;
  porNivel: Record<string, number>;
};

export const usuarioNivelDisciplinaService = {
  /**
   * One read of the tenant's level assignments (readable by any tenant member), reduced client-side
   * into counts per discipline and per level.
   */
  async countAtletasPorNivel(tenantId: string): Promise<AtletasPorNivel> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('usuario_nivel_disciplina')
      .select('disciplina_id, nivel_id')
      .eq('tenant_id', tenantId);

    if (error) {
      throw mapPostgrestError(error);
    }

    const result: AtletasPorNivel = { porDisciplina: {}, porNivel: {} };
    for (const row of (data ?? []) as Array<{ disciplina_id: string; nivel_id: string }>) {
      result.porDisciplina[row.disciplina_id] = (result.porDisciplina[row.disciplina_id] ?? 0) + 1;
      result.porNivel[row.nivel_id] = (result.porNivel[row.nivel_id] ?? 0) + 1;
    }
    return result;
  },

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
