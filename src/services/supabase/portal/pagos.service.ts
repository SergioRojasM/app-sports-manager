import { createClient } from '@/services/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Pago, PagoInsert } from '@/types/portal/pagos.types';

export const pagosService = {
  async createPago(payload: PagoInsert): Promise<Pago> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('pagos')
      .insert({
        tenant_id: payload.tenant_id,
        suscripcion_id: payload.suscripcion_id,
        monto: payload.monto,
        comprobante_path: payload.comprobante_path,
        estado: payload.estado,
        metodo_pago_id: payload.metodo_pago_id ?? null,
      })
      .select(
        'id, tenant_id, suscripcion_id, monto, metodo_pago, metodo_pago_id, comprobante_path, estado, validado_por, fecha_pago, fecha_validacion, created_at',
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'No fue posible crear el pago.');
    }

    return data as Pago;
  },

  /**
   * Resubmitting a proof re-enters the review queue: reset estado back to 'pendiente'
   * and clear any prior rejection reason (US-0106) — a rejected pago used to stay
   * 'rechazado' forever after re-upload.
   */
  async updateComprobantePath(supabase: SupabaseClient, pagoId: string, path: string): Promise<void> {
    const { error } = await supabase
      .from('pagos')
      .update({ comprobante_path: path, estado: 'pendiente', motivo_rechazo: null })
      .eq('id', pagoId);

    if (error) {
      throw new Error(error.message);
    }
  },
};
