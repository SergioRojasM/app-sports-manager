import { createClient } from '@/services/supabase/client';
import {
  DisciplineServiceError,
  type CreateDisciplineInput,
  type Discipline,
  type UpdateDisciplineInput,
} from '@/types/portal/disciplines.types';

type DisciplineRow = Omit<Discipline, 'nombre'> & {
  nombre: string | null;
};

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function mapDisciplineRow(row: DisciplineRow): Discipline {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    nombre: row.nombre ?? 'Disciplina sin nombre',
    descripcion: row.descripcion,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPostgrestError(error: { code?: string; constraint?: string } | null): DisciplineServiceError {
  if (!error) {
    return new DisciplineServiceError('unknown', 'No fue posible completar la operación de disciplinas.');
  }

  if (error.code === '23505' && error.constraint === 'disciplinas_tenant_nombre_uk') {
    return new DisciplineServiceError('duplicate_name', 'Ya existe una disciplina con ese nombre en esta organización.');
  }

  if (error.code === '23503' && error.constraint === 'entrenamientos_disciplina_id_fkey') {
    return new DisciplineServiceError('fk_dependency', 'No se puede eliminar la disciplina porque está asociada a entrenamientos.');
  }

  if (error.code === '42501') {
    return new DisciplineServiceError('forbidden', 'No tienes permisos para realizar esta acción en esta organización.');
  }

  return new DisciplineServiceError('unknown', 'No fue posible completar la operación de disciplinas.');
}

export const disciplinesService = {
  async listDisciplinesByTenant(tenantId: string): Promise<Discipline[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('disciplinas')
      .select('id, tenant_id, nombre, descripcion, activo, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw mapPostgrestError(error);
    }

    return ((data ?? []) as DisciplineRow[]).map(mapDisciplineRow);
  },

  async createDiscipline(payload: CreateDisciplineInput): Promise<Discipline> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('disciplinas')
      .insert({
        tenant_id: payload.tenantId,
        nombre: payload.nombre.trim(),
        descripcion: toNullable(payload.descripcion),
        activo: payload.activo ?? true,
      })
      .select('id, tenant_id, nombre, descripcion, activo, created_at, updated_at')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    return mapDisciplineRow(data as DisciplineRow);
  },

  async updateDiscipline(disciplineId: string, payload: UpdateDisciplineInput): Promise<Discipline> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('disciplinas')
      .update({
        nombre: payload.nombre.trim(),
        descripcion: toNullable(payload.descripcion),
        activo: payload.activo ?? true,
      })
      .eq('id', disciplineId)
      .eq('tenant_id', payload.tenantId)
      .select('id, tenant_id, nombre, descripcion, activo, created_at, updated_at')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    return mapDisciplineRow(data as DisciplineRow);
  },

  async deleteDiscipline(disciplineId: string, tenantId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('disciplinas')
      .delete()
      .eq('id', disciplineId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw mapPostgrestError(error);
    }
  },
};