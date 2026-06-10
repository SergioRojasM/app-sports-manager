import { createClient } from '@/services/supabase/client';
import {
  ServicioServiceError,
  type Servicio,
  type CreateServicioInput,
  type UpdateServicioInput,
  type PlanTipoServicio,
  type PlanTipoServicioRow,
} from '@/types/portal/servicios.types';

type PostgrestError = { code?: string; message?: string };

function mapServicioError(error: PostgrestError | null): ServicioServiceError {
  if (!error) {
    return new ServicioServiceError('unknown', 'No fue posible completar la operación.');
  }
  if (error.code === '23505') {
    return new ServicioServiceError('duplicate_nombre', 'Ya existe un servicio con este nombre.');
  }
  if (error.code === '23503') {
    return new ServicioServiceError(
      'referenced_by_plan_tipos',
      'Este servicio está asociado a uno o más tipos de plan y no puede eliminarse.',
    );
  }
  if (error.code === '42501') {
    return new ServicioServiceError('forbidden', 'No tienes permisos para realizar esta acción.');
  }
  return new ServicioServiceError('unknown', 'No fue posible completar la operación.');
}

export const serviciosService = {
  // -----------------------------------------------------------------------
  // Servicios CRUD
  // -----------------------------------------------------------------------

  async getServiciosByTenant(tenantId: string): Promise<Servicio[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nombre');

    if (error) throw mapServicioError(error);
    return (data ?? []) as Servicio[];
  },

  async getServiciosActivosByTenant(tenantId: string): Promise<Servicio[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw mapServicioError(error);
    return (data ?? []) as Servicio[];
  },

  async createServicio(input: CreateServicioInput): Promise<Servicio> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('servicios')
      .insert({
        tenant_id: input.tenant_id,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        activo: input.activo ?? true,
      })
      .select('*')
      .single();

    if (error || !data) throw mapServicioError(error);
    return data as Servicio;
  },

  async updateServicio(id: string, input: UpdateServicioInput): Promise<Servicio> {
    const supabase = createClient();
    const payload: Record<string, unknown> = {};
    if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
    if (input.descripcion !== undefined) payload.descripcion = input.descripcion?.trim() || null;
    if (input.activo !== undefined) payload.activo = input.activo;

    const { data, error } = await supabase
      .from('servicios')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) throw mapServicioError(error);
    return data as Servicio;
  },

  async deleteServicio(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id);

    if (error) throw mapServicioError(error);
  },

  // -----------------------------------------------------------------------
  // PlanTipoServicios operations
  // -----------------------------------------------------------------------

  async getPlanTipoServicios(planTipoId: string): Promise<PlanTipoServicio[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plan_tipos_servicios')
      .select('*, servicios(nombre)')
      .eq('plan_tipo_id', planTipoId)
      .order('servicios(nombre)');

    if (error) throw mapServicioError(error);

    return ((data ?? []) as unknown as Array<{
      id: string;
      plan_tipo_id: string;
      servicio_id: string;
      unidades: number | null;
      created_at: string;
      updated_at: string;
      servicios: { nombre: string } | null;
    }>).map((row) => ({
      id: row.id,
      plan_tipo_id: row.plan_tipo_id,
      servicio_id: row.servicio_id,
      unidades: row.unidades,
      created_at: row.created_at,
      updated_at: row.updated_at,
      servicio_nombre: row.servicios?.nombre ?? '',
    }));
  },

  async syncPlanTipoServicios(planTipoId: string, rows: PlanTipoServicioRow[]): Promise<void> {
    const supabase = createClient();

    // Delete all existing rows for this plan tipo
    const { error: deleteError } = await supabase
      .from('plan_tipos_servicios')
      .delete()
      .eq('plan_tipo_id', planTipoId);

    if (deleteError) throw mapServicioError(deleteError);

    // Insert new rows (skip rows with empty servicioId)
    const validRows = rows.filter((r) => r.servicioId);
    if (validRows.length === 0) return;

    const insertPayload = validRows.map((r) => ({
      plan_tipo_id: planTipoId,
      servicio_id: r.servicioId,
      unidades: r.unidades,
    }));

    const { error: insertError } = await supabase
      .from('plan_tipos_servicios')
      .insert(insertPayload);

    if (insertError) throw mapServicioError(insertError);
  },
};
