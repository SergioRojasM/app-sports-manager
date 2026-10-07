import { createClient } from '@/services/supabase/client';
import {
  ReglaNotificacionServiceError,
  type ReglaNotificacion,
  type ReglaNotificacionCreatePayload,
  type ReglaNotificacionUpdatePayload,
} from '@/types/portal/reglas-notificacion.types';

const COLUMNS =
  'id, tenant_id, tipo, dias, destinatarios, canal_in_app, canal_email, activo, created_at, updated_at';

function mapError(error: { code?: string; message?: string } | null): ReglaNotificacionServiceError {
  if (error?.code === '23505') {
    return new ReglaNotificacionServiceError('duplicate', 'Ya existe una regla para ese número de días.');
  }
  if (error?.message?.includes('MAX_REGLAS_NOTIFICACION')) {
    return new ReglaNotificacionServiceError('max_reached', 'Solo puedes tener 3 reglas de cada tipo.');
  }
  if (error?.code === '42501') {
    return new ReglaNotificacionServiceError('forbidden', 'No tienes permisos para gestionar estas reglas.');
  }
  return new ReglaNotificacionServiceError('unknown', 'No fue posible guardar la regla. Inténtalo nuevamente.');
}

/** Tenant notification rules (US-0135). RLS: only the tenant's administrators read or write them. */
export const reglasNotificacionService = {
  async listReglas(tenantId: string): Promise<ReglaNotificacion[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tenant_reglas_notificacion')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
      .order('tipo', { ascending: true })
      .order('dias', { ascending: true });

    if (error) {
      throw new ReglaNotificacionServiceError('unknown', 'No fue posible cargar las reglas de notificación.');
    }

    return (data ?? []) as ReglaNotificacion[];
  },

  async createRegla(payload: ReglaNotificacionCreatePayload): Promise<ReglaNotificacion> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tenant_reglas_notificacion')
      .insert({
        tenant_id: payload.tenant_id,
        tipo: payload.tipo,
        dias: payload.dias,
        destinatarios: payload.destinatarios,
        canal_in_app: payload.canal_in_app,
        canal_email: payload.canal_email,
        activo: payload.activo,
      })
      .select(COLUMNS)
      .single();

    if (error || !data) throw mapError(error);
    return data as ReglaNotificacion;
  },

  async updateRegla(id: string, payload: ReglaNotificacionUpdatePayload): Promise<ReglaNotificacion> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tenant_reglas_notificacion')
      .update({
        dias: payload.dias,
        destinatarios: payload.destinatarios,
        canal_in_app: payload.canal_in_app,
        canal_email: payload.canal_email,
        activo: payload.activo,
      })
      .eq('id', id)
      .select(COLUMNS)
      .single();

    if (error || !data) throw mapError(error);
    return data as ReglaNotificacion;
  },

  async deleteRegla(id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from('tenant_reglas_notificacion').delete().eq('id', id);

    if (error) {
      throw new ReglaNotificacionServiceError('unknown', 'No fue posible eliminar la regla. Inténtalo nuevamente.');
    }
  },
};
