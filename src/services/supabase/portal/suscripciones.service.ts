import { createClient } from '@/services/supabase/client';
import {
  SuscripcionServiceError,
  type ComprarSuscripcionPayload,
  type ComprarSuscripcionResultado,
  type SuscripcionServicio,
} from '@/types/portal/suscripciones.types';

function mapCompraError(message: string | undefined): SuscripcionServiceError {
  const text = message ?? '';
  if (text.includes('PLAN_NO_DISPONIBLE') || text.includes('SUBTIPO_NO_DISPONIBLE')) {
    return new SuscripcionServiceError(
      'plan_unavailable',
      'Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
    );
  }
  if (text.includes('SUSCRIPCION_PENDIENTE_EXISTENTE')) {
    return new SuscripcionServiceError('pending_exists', 'Ya tienes una solicitud pendiente para este plan.');
  }
  if (text.includes('METODO_PAGO_INVALIDO')) {
    return new SuscripcionServiceError(
      'invalid_payment_method',
      'El método de pago seleccionado ya no está disponible. Elige otro.',
    );
  }
  if (text.includes('COMPROBANTE_INVALIDO')) {
    return new SuscripcionServiceError('invalid_proof', 'No se pudo adjuntar el comprobante. Inténtalo nuevamente.');
  }
  return new SuscripcionServiceError('unknown', 'No fue posible crear la suscripción.');
}

export const suscripcionesService = {
  /**
   * Buys a plan through the `comprar_suscripcion` RPC (US-0134): subscription, service units and
   * payment are created in one transaction, with the amount and the athlete set by the server.
   * The proof, if any, must already be uploaded to `comprobantePath`.
   */
  async comprarSuscripcion(payload: ComprarSuscripcionPayload): Promise<ComprarSuscripcionResultado> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('comprar_suscripcion', {
      p_tenant_id: payload.tenantId,
      p_plan_id: payload.planId,
      p_plan_tipo_id: payload.planTipoId,
      p_metodo_pago_id: payload.metodoPagoId,
      p_comentarios: payload.comentarios,
      p_pago_id: payload.pagoId,
      p_comprobante_path: payload.comprobantePath,
    });

    if (error || !data) {
      throw mapCompraError(error?.message);
    }

    const row = data as { suscripcion_id: string; pago_id: string };
    return { suscripcionId: row.suscripcion_id, pagoId: row.pago_id };
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
