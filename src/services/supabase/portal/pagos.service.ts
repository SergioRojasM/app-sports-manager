import type { SupabaseClient } from '@supabase/supabase-js';

export const pagosService = {
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
