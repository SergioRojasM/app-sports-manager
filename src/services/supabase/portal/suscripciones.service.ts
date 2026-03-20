import { createClient } from '@/services/supabase/client';
import type { Suscripcion, SuscripcionInsert } from '@/types/portal/suscripciones.types';

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
        clases_plan: payload.clases_plan,
        comentarios: payload.comentarios,
        estado: payload.estado,
      })
      .select(
        'id, tenant_id, atleta_id, plan_id, plan_tipo_id, fecha_inicio, fecha_fin, clases_restantes, clases_plan, comentarios, estado, created_at',
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'No fue posible crear la suscripción.');
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
};
