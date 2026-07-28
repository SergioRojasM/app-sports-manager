import type { SupabaseClient } from '@supabase/supabase-js';
import type { MiSuscripcionRow, MiPagoRow } from '@/types/portal/mis-suscripciones.types';
import type { PagoEstado, SuscripcionEstado } from '@/types/portal/gestion-suscripciones.types';
import type { SuscripcionServicioDisplay } from '@/types/portal/suscripciones.types';

type RawRow = {
  id: string;
  tenant_id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  tenant: { nombre: string | null } | null;
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
  suscripcion_servicios: Array<{
    servicio_id: string;
    unidades_incluidas: number | null;
    unidades_restantes: number | null;
    servicio: { nombre: string } | null;
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

  const servicios: SuscripcionServicioDisplay[] = (row.suscripcion_servicios ?? []).map((s) => ({
    servicio_id: s.servicio_id,
    servicio_nombre: s.servicio?.nombre ?? '',
    unidades_incluidas: s.unidades_incluidas,
    unidades_restantes: s.unidades_restantes,
  }));

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    tenant_nombre: row.tenant?.nombre ?? 'Organización',
    plan_nombre: row.plan.nombre,
    estado: row.estado as SuscripcionEstado,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    pago,
    servicios,
  };
}

/**
 * Every subscription held by the user, across all organizations (US-0093).
 * RLS (`suscripciones_select_own`) restricts rows to `atleta_id = auth.uid()`.
 */
export async function fetchMisSuscripciones(
  supabase: SupabaseClient,
  userId: string,
): Promise<MiSuscripcionRow[]> {
  const { data, error } = await supabase
    .from('suscripciones')
    .select(
      `
      id, tenant_id, fecha_inicio, fecha_fin, estado,
      tenant:tenants!suscripciones_tenant_id_fkey(nombre),
      plan:planes!suscripciones_plan_id_fkey(nombre),
      pagos(
        id, monto, estado, fecha_pago, comprobante_path,
        metodo_pago_ref:tenant_metodos_pago!pagos_metodo_pago_id_fkey(nombre, tipo)
      ),
      suscripcion_servicios(
        servicio_id, unidades_incluidas, unidades_restantes,
        servicio:servicios!suscripcion_servicios_servicio_id_fkey(nombre)
      )
      `,
    )
    .eq('atleta_id', userId)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'pagos', ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as RawRow[]).map(mapRow);
}
