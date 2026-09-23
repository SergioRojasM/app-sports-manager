import { createClient } from '@/services/supabase/client';
import { AnaliticaServiceError, type AnaliticaDashboard } from '@/types/portal/analitica.types';

type RpcError = { code?: string; message?: string } | null;

function mapRpcError(error: RpcError): AnaliticaServiceError {
  if (error?.code === '42501') {
    return new AnaliticaServiceError('forbidden', 'No tienes permisos para consultar la analítica de esta organización.');
  }

  if (error?.code === '22007') {
    return new AnaliticaServiceError('invalidRange', 'El rango de fechas no es válido.');
  }

  return new AnaliticaServiceError('unknown', error?.message ?? 'No fue posible cargar la analítica.');
}

export const analiticaService = {
  async fetchDashboard(tenantId: string, dateFrom: string, dateTo: string): Promise<AnaliticaDashboard> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_tenant_bi_dashboard', {
      p_tenant_id: tenantId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });

    if (error) throw mapRpcError(error);
    return data as AnaliticaDashboard;
  },
};