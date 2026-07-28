import { createClient } from '@/services/supabase/client';
import {
  SuscripcionServiceError,
  type Suscripcion,
  type SuscripcionInsert,
  type SuscripcionServicio,
} from '@/types/portal/suscripciones.types';

export const suscripcionesService = {
  async createSuscripcion(payload: SuscripcionInsert): Promise<Suscripcion> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('suscripciones')
      .insert({
        tenant_id: payload.tenant_id,
        atleta_id: payload.atleta_id,
        plan_id: payload.plan_id,
        plan_tipo_id: payload.plan_tipo_id ?? null,
        comentarios: payload.comentarios,
        estado: payload.estado,
      })
      .select(
        'id, tenant_id, atleta_id, plan_id, plan_tipo_id, fecha_inicio, fecha_fin, comentarios, estado, created_at',
      )
      .single();

    if (error || !data) {
      // RLS (`suscripciones_insert_own`) rejects plans that are inactive, private,
      // or no longer public — the catalog the user is looking at is stale.
      if (error?.code === '42501') {
        throw new SuscripcionServiceError(
          'plan_unavailable',
          'Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
        );
      }

      throw new SuscripcionServiceError(
        'unknown',
        error?.message ?? 'No fue posible crear la suscripción.',
      );
    }

    if (payload.plan_tipo_id) {
      const { error: rpcError } = await supabase.rpc('populate_suscripcion_servicios', {
        p_suscripcion_id: data.id,
        p_plan_tipo_id: payload.plan_tipo_id,
      });

      if (rpcError) {
        throw new Error(rpcError.message ?? 'No fue posible registrar las unidades por servicio.');
      }
    }

    return data as Suscripcion;
  },

  async hasPendingSuscripcion(atletaId: string, planId: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('suscripciones')
      .select('id')
      .eq('atleta_id', atletaId)
      .eq('plan_id', planId)
      .eq('estado', 'pendiente')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message ?? 'No fue posible verificar suscripciones pendientes.');
    }

    return data !== null;
  },

  async getSuscripcionServicios(suscripcionId: string): Promise<SuscripcionServicio[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('suscripcion_servicios')
      .select('id, suscripcion_id, servicio_id, unidades_incluidas, unidades_restantes, created_at')
      .eq('suscripcion_id', suscripcionId);

    if (error) {
      throw new Error(error.message ?? 'No fue posible obtener las unidades por servicio.');
    }

    return (data ?? []) as SuscripcionServicio[];
  },
};
