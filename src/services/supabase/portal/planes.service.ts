import { createClient } from '@/services/supabase/client';
import {
  PlanServiceError,
  type CreatePlanInput,
  type CreatePlanTipoInput,
  type Plan,
  type PlanModalidad,
  type PlanTipo,
  type PlanWithDisciplinas,
  type UpdatePlanInput,
  type UpdatePlanTipoInput,
} from '@/types/portal/planes.types';

type PlanTipoRow = {
  id: string;
  plan_id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  vigencia_dias: number;
  clases_incluidas: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

type PlanRow = {
  id: string;
  tenant_id: string;
  nombre: string | null;
  descripcion: string | null;
  precio: number;
  vigencia_meses: number;
  clases_incluidas: number | null;
  tipo: string | null;
  beneficios: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  planes_disciplina: { disciplina_id: string }[];
  plan_tipos: PlanTipoRow[];
};

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableInt(value: number | null | undefined): number | null {
  if (value == null || isNaN(value)) return null;
  return value;
}

function mapPlanRow(row: PlanRow): PlanWithDisciplinas {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    nombre: row.nombre ?? 'Plan sin nombre',
    descripcion: row.descripcion,
    precio: row.precio,
    vigencia_meses: row.vigencia_meses,
    clases_incluidas: row.clases_incluidas,
    tipo: (row.tipo as PlanModalidad) ?? null,
    beneficios: row.beneficios,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    disciplinas: (row.planes_disciplina ?? []).map((pd) => pd.disciplina_id),
    plan_tipos: (row.plan_tipos ?? []) as PlanTipo[],
  };
}

function mapPostgrestError(error: { code?: string; constraint?: string } | null): PlanServiceError {
  if (!error) {
    return new PlanServiceError('unknown', 'No fue posible completar la operación de planes.');
  }

  if (error.code === '23505' && error.constraint === 'planes_tenant_nombre_uk') {
    return new PlanServiceError('duplicate_name', 'Ya existe un plan con ese nombre en esta organización.');
  }

  if (error.code === '23503') {
    return new PlanServiceError('fk_dependency', 'No se puede eliminar el plan porque tiene dependencias asociadas.');
  }

  if (error.code === '42501') {
    return new PlanServiceError('forbidden', 'No tienes permisos para realizar esta acción en esta organización.');
  }

  return new PlanServiceError('unknown', 'No fue posible completar la operación de planes.');
}

export const planesService = {
  async getPlanes(tenantId: string): Promise<PlanWithDisciplinas[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('planes')
      .select('id, tenant_id, nombre, descripcion, precio, vigencia_meses, clases_incluidas, tipo, beneficios, activo, created_at, updated_at, planes_disciplina(disciplina_id), plan_tipos(*)')
      .eq('tenant_id', tenantId)
      .order('nombre');

    if (error) {
      throw mapPostgrestError(error);
    }

    return ((data ?? []) as unknown as PlanRow[]).map(mapPlanRow);
  },

  async createPlan(input: CreatePlanInput): Promise<Plan> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('planes')
      .insert({
        tenant_id: input.tenantId,
        nombre: input.nombre.trim(),
        descripcion: toNullable(input.descripcion),
        precio: input.precio,
        vigencia_meses: input.vigencia_meses,
        clases_incluidas: toNullableInt(input.clases_incluidas),
        tipo: toNullable(input.tipo),
        beneficios: toNullable(input.beneficios),
        activo: input.activo ?? true,
      })
      .select('id, tenant_id, nombre, descripcion, precio, vigencia_meses, clases_incluidas, tipo, beneficios, activo, created_at, updated_at')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    // Insert discipline associations
    if (input.disciplinaIds.length > 0) {
      const rows = input.disciplinaIds.map((disciplinaId) => ({
        plan_id: data.id,
        disciplina_id: disciplinaId,
      }));

      const { error: joinError } = await supabase
        .from('planes_disciplina')
        .insert(rows);

      if (joinError) {
        throw mapPostgrestError(joinError);
      }
    }

    return data as Plan;
  },

  async updatePlan(input: UpdatePlanInput): Promise<Plan> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('planes')
      .update({
        nombre: input.nombre.trim(),
        descripcion: toNullable(input.descripcion),
        precio: input.precio,
        vigencia_meses: input.vigencia_meses,
        clases_incluidas: toNullableInt(input.clases_incluidas),
        tipo: toNullable(input.tipo),
        beneficios: toNullable(input.beneficios),
        activo: input.activo ?? true,
      })
      .eq('id', input.planId)
      .eq('tenant_id', input.tenantId)
      .select('id, tenant_id, nombre, descripcion, precio, vigencia_meses, clases_incluidas, tipo, beneficios, activo, created_at, updated_at')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    // Replace discipline associations: delete existing, then insert new
    const { error: deleteError } = await supabase
      .from('planes_disciplina')
      .delete()
      .eq('plan_id', input.planId);

    if (deleteError) {
      throw mapPostgrestError(deleteError);
    }

    if (input.disciplinaIds.length > 0) {
      const rows = input.disciplinaIds.map((disciplinaId) => ({
        plan_id: input.planId,
        disciplina_id: disciplinaId,
      }));

      const { error: insertError } = await supabase
        .from('planes_disciplina')
        .insert(rows);

      if (insertError) {
        throw mapPostgrestError(insertError);
      }
    }

    return data as Plan;
  },

  async deletePlan(planId: string, tenantId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('planes')
      .delete()
      .eq('id', planId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw mapPostgrestError(error);
    }
  },

  async getPlanTiposByPlan(planId: string): Promise<PlanTipo[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('plan_tipos')
      .select('*')
      .eq('plan_id', planId)
      .order('nombre');

    if (error) {
      throw mapPostgrestError(error);
    }

    return (data ?? []) as PlanTipo[];
  },

  async createPlanTipo(input: CreatePlanTipoInput): Promise<PlanTipo> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('plan_tipos')
      .insert({
        plan_id: input.plan_id,
        tenant_id: input.tenant_id,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        precio: input.precio,
        vigencia_dias: input.vigencia_dias,
        clases_incluidas: input.clases_incluidas,
        activo: input.activo ?? true,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    return data as PlanTipo;
  },

  async updatePlanTipo(id: string, input: UpdatePlanTipoInput): Promise<PlanTipo> {
    const supabase = createClient();

    const payload: Record<string, unknown> = {};
    if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
    if (input.descripcion !== undefined) payload.descripcion = input.descripcion?.trim() || null;
    if (input.precio !== undefined) payload.precio = input.precio;
    if (input.vigencia_dias !== undefined) payload.vigencia_dias = input.vigencia_dias;
    if (input.clases_incluidas !== undefined) payload.clases_incluidas = input.clases_incluidas;
    if (input.activo !== undefined) payload.activo = input.activo;

    const { data, error } = await supabase
      .from('plan_tipos')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw mapPostgrestError(error);
    }

    return data as PlanTipo;
  },

  async deletePlanTipo(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
    const supabase = createClient();

    // Check for active/pending subscriptions referencing this subtype
    const { count, error: countError } = await supabase
      .from('suscripciones')
      .select('id', { count: 'exact', head: true })
      .eq('plan_tipo_id', id)
      .in('estado', ['activa', 'pendiente']);

    if (countError) {
      throw mapPostgrestError(countError);
    }

    if ((count ?? 0) > 0) {
      // Soft-deactivate instead of deleting
      await supabase
        .from('plan_tipos')
        .update({ activo: false })
        .eq('id', id);

      return { deleted: false, deactivated: true };
    }

    const { error } = await supabase
      .from('plan_tipos')
      .delete()
      .eq('id', id);

    if (error) {
      throw mapPostgrestError(error);
    }

    return { deleted: true, deactivated: false };
  },
};
