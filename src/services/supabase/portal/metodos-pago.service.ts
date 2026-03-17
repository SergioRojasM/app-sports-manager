import { createClient } from '@/services/supabase/client';
import type {
  MetodoPago,
  CreateMetodoPagoInput,
  UpdateMetodoPagoInput,
} from '@/types/portal/metodos-pago.types';

const COLUMNS =
  'id, tenant_id, nombre, tipo, valor, url, comentarios, activo, orden, created_at, updated_at';

export const metodosPagoService = {
  async getMetodosPago(tenantId: string, onlyActive = false): Promise<MetodoPago[]> {
    const supabase = createClient();

    let query = supabase
      .from('tenant_metodos_pago')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });

    if (onlyActive) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('No fue posible cargar los métodos de pago.');
    }

    return (data ?? []) as MetodoPago[];
  },

  async createMetodoPago(payload: CreateMetodoPagoInput): Promise<MetodoPago> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tenant_metodos_pago')
      .insert({
        tenant_id: payload.tenant_id,
        nombre: payload.nombre.trim(),
        tipo: payload.tipo,
        valor: payload.valor?.trim() || null,
        url: payload.url?.trim() || null,
        comentarios: payload.comentarios?.trim() || null,
        activo: payload.activo ?? true,
        orden: payload.orden ?? 0,
      })
      .select(COLUMNS)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'No fue posible crear el método de pago.');
    }

    return data as MetodoPago;
  },

  async updateMetodoPago(id: string, payload: UpdateMetodoPagoInput): Promise<MetodoPago> {
    const supabase = createClient();

    const updates: Record<string, unknown> = {};
    if (payload.nombre !== undefined) updates.nombre = payload.nombre.trim();
    if (payload.tipo !== undefined) updates.tipo = payload.tipo;
    if (payload.valor !== undefined) updates.valor = payload.valor?.trim() || null;
    if (payload.url !== undefined) updates.url = payload.url?.trim() || null;
    if (payload.comentarios !== undefined) updates.comentarios = payload.comentarios?.trim() || null;
    if (payload.activo !== undefined) updates.activo = payload.activo;
    if (payload.orden !== undefined) updates.orden = payload.orden;

    const { data, error } = await supabase
      .from('tenant_metodos_pago')
      .update(updates)
      .eq('id', id)
      .select(COLUMNS)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'No fue posible actualizar el método de pago.');
    }

    return data as MetodoPago;
  },

  async deleteMetodoPago(id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('tenant_metodos_pago')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error?.message ?? 'No fue posible eliminar el método de pago.');
    }
  },
};
