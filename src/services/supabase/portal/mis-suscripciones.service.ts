import type { SupabaseClient } from '@supabase/supabase-js';
import type { MiSuscripcionRow, MiPagoRow } from '@/types/portal/mis-suscripciones-y-pagos.types';
import type { PagoEstado, SuscripcionEstado } from '@/types/portal/gestion-suscripciones.types';

type RawRow = {
  id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  estado: string;
  plan: { nombre: string };
  pagos: Array<{
    id: string;
    monto: number;
    estado: string;
    fecha_pago: string | null;
    comprobante_path: string | null;
    metodo_pago_ref: {
      nombre: string;
      tipo: string;
    } | null;
  }>;
};

function mapRow(row: RawRow): MiSuscripcionRow {
  const rawPago = row.pagos.length > 0 ? row.pagos[0] : null;

  const pago: MiPagoRow | null = rawPago
    ? {
        id: rawPago.id,
        monto: rawPago.monto,
        metodo_pago_nombre: rawPago.metodo_pago_ref?.nombre ?? null,
        metodo_pago_tipo: rawPago.metodo_pago_ref?.tipo ?? null,
        estado: rawPago.estado as PagoEstado,
        fecha_pago: rawPago.fecha_pago,
        comprobante_path: rawPago.comprobante_path,
      }
    : null;

  return {
    id: row.id,
    plan_nombre: row.plan.nombre,
    estado: row.estado as SuscripcionEstado,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    clases_restantes: row.clases_restantes,
    clases_plan: row.clases_plan,
    pago,
  };
}

export async function fetchMisSuscripcionesTenant(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<MiSuscripcionRow[]> {
  const { data, error } = await supabase
    .from('suscripciones')
    .select(
      `
      id, fecha_inicio, fecha_fin, clases_restantes, clases_plan, estado,
      plan:planes!suscripciones_plan_id_fkey(nombre),
      pagos(
        id, monto, estado, fecha_pago, comprobante_path,
        metodo_pago_ref:tenant_metodos_pago!pagos_metodo_pago_id_fkey(nombre, tipo)
      )
      `,
    )
    .eq('tenant_id', tenantId)
    .eq('atleta_id', userId)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'pagos', ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as RawRow[]).map(mapRow);
}
