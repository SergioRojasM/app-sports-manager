import { createClient } from '@/services/supabase/client';
import type {
  ReglaSuspension,
  ReglaSuspensionCreatePayload,
  ReglaSuspensionUpdatePayload,
} from '@/types/portal/reglas-suspension.types';

const COLUMNS =
  'id, tenant_id, nombre, num_inasistencias, por_suscripcion, por_dias_atras, duracion, activo, created_at, updated_at';

export const reglasSuspensionService = {
  async getReglasSuspension(tenantId: string): Promise<ReglaSuspension[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tenant_reglas_suspension')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('No fue posible cargar las reglas de suspensión.');
    }

    return (data ?? []) as ReglaSuspension[];
  },

  async createReglaSuspension(payload: ReglaSuspensionCreatePayload): Promise<ReglaSuspension> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tenant_reglas_suspension')
      .insert({
        tenant_id: payload.tenant_id,
        nombre: payload.nombre.trim(),
        num_inasistencias: payload.num_inasistencias,
        por_suscripcion: payload.por_suscripcion,
        por_dias_atras: payload.por_dias_atras,
        duracion: payload.duracion,
        activo: payload.activo ?? true,
      })
      .select(COLUMNS)
      .single();

    if (error || !data) {
      throw error ?? new Error('No fue posible crear la regla de suspensión.');
    }

    return data as ReglaSuspension;
  },

  async updateReglaSuspension(id: string, payload: ReglaSuspensionUpdatePayload): Promise<ReglaSuspension> {
    const supabase = createClient();

    const updates: Record<string, unknown> = {};
    if (payload.nombre !== undefined) updates.nombre = payload.nombre.trim();
    if (payload.num_inasistencias !== undefined) updates.num_inasistencias = payload.num_inasistencias;
    if (payload.por_suscripcion !== undefined) updates.por_suscripcion = payload.por_suscripcion;
    if (payload.por_dias_atras !== undefined) updates.por_dias_atras = payload.por_dias_atras;
    if (payload.duracion !== undefined) updates.duracion = payload.duracion;
    if (payload.activo !== undefined) updates.activo = payload.activo;

    const { data, error } = await supabase
      .from('tenant_reglas_suspension')
      .update(updates)
      .eq('id', id)
      .select(COLUMNS)
      .single();

    if (error || !data) {
      throw error ?? new Error('No fue posible actualizar la regla de suspensión.');
    }

    return data as ReglaSuspension;
  },

  async deleteReglaSuspension(id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('tenant_reglas_suspension')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error?.message ?? 'No fue posible eliminar la regla de suspensión.');
    }
  },
};
