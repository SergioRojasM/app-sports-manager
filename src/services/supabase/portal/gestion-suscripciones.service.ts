import { createClient } from '@/services/supabase/client';
import {
  GestionSuscripcionesServiceError,
  type PagoAdminRow,
  type PagoEstado,
  type SuscripcionAdminRow,
  type ValidarSuscripcionFormValues,
} from '@/types/portal/gestion-suscripciones.types';

/* ────────── Raw row shape returned by Supabase join ────────── */

type RawSuscripcionRow = {
  id: string;
  tenant_id: string;
  plan_id: string;
  atleta_id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  clases_restantes: number | null;
  clases_plan: number | null;
  estado: string;
  comentarios: string | null;
  validado_por: string | null;
  created_at: string;
  validador_suscripcion: {
    nombre: string | null;
    apellido: string | null;
  } | null;
  atleta: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  };
  plan: {
    nombre: string;
    vigencia_meses: number;
    clases_incluidas: number | null;
  };
  pagos: Array<{
    id: string;
    monto: number;
    metodo_pago: string | null;
    comprobante_url: string | null;
    estado: string;
    validado_por: string | null;
    fecha_pago: string | null;
    fecha_validacion: string | null;
    created_at: string;
    validador: {
      nombre: string | null;
      apellido: string | null;
    } | null;
  }>;
};

/* ────────── Mappers ────────── */

function mapRawRow(row: RawSuscripcionRow): SuscripcionAdminRow {
  const latestPago = row.pagos.length > 0 ? row.pagos[0] : null;

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    plan_id: row.plan_id,
    plan_nombre: row.plan.nombre,
    plan_vigencia_meses: row.plan.vigencia_meses,
    plan_clases_incluidas: row.plan.clases_incluidas,
    atleta_id: row.atleta_id,
    atleta_nombre: `${row.atleta.nombre ?? ''} ${row.atleta.apellido ?? ''}`.trim(),
    atleta_email: row.atleta.email,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    clases_restantes: row.clases_restantes,
    clases_plan: row.clases_plan,
    estado: row.estado as SuscripcionAdminRow['estado'],
    comentarios: row.comentarios,
    validado_por: row.validado_por,
    validado_por_nombre: row.validador_suscripcion
      ? `${row.validador_suscripcion.nombre ?? ''} ${row.validador_suscripcion.apellido ?? ''}`.trim() || null
      : null,
    created_at: row.created_at,
    pago: latestPago
      ? ({
          id: latestPago.id,
          monto: latestPago.monto,
          metodo_pago: latestPago.metodo_pago as PagoAdminRow['metodo_pago'],
          comprobante_url: latestPago.comprobante_url,
          estado: latestPago.estado as PagoAdminRow['estado'],
          validado_por: latestPago.validado_por,
          validado_por_nombre: latestPago.validador
            ? `${latestPago.validador.nombre ?? ''} ${latestPago.validador.apellido ?? ''}`.trim() || null
            : null,
          fecha_pago: latestPago.fecha_pago,
          fecha_validacion: latestPago.fecha_validacion,
          created_at: latestPago.created_at,
        } satisfies PagoAdminRow)
      : null,
  };
}

function mapPostgrestError(
  error: { code?: string; message?: string } | null,
): GestionSuscripcionesServiceError {
  if (!error) {
    return new GestionSuscripcionesServiceError('unknown', 'Ocurrió un error inesperado.');
  }

  if (error.code === '42501') {
    return new GestionSuscripcionesServiceError(
      'forbidden',
      'No tienes permisos para realizar esta acción.',
    );
  }

  return new GestionSuscripcionesServiceError(
    'unknown',
    error.message ?? 'Ocurrió un error inesperado.',
  );
}

/* ────────── Service object ────────── */

export const gestionSuscripcionesService = {
  /**
   * Fetch all subscriptions for a tenant with joined athlete, plan, and latest payment data.
   * Uses the browser Supabase client (RLS-aware).
   */
  async fetchSuscripcionesAdmin(tenantId: string): Promise<SuscripcionAdminRow[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('suscripciones')
      .select(
        `
        id, tenant_id, plan_id, atleta_id,
        fecha_inicio, fecha_fin, clases_restantes, clases_plan,
        estado, comentarios, validado_por, created_at,
        validador_suscripcion:usuarios!suscripciones_validado_por_fkey(nombre, apellido),
        atleta:usuarios!suscripciones_atleta_id_fkey(nombre, apellido, email),
        plan:planes!suscripciones_plan_id_fkey(nombre, vigencia_meses, clases_incluidas),
        pagos(id, monto, metodo_pago, comprobante_url, estado, validado_por, fecha_pago, fecha_validacion, created_at, validador:usuarios!pagos_validado_por_fkey(nombre, apellido))
        `,
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'pagos', ascending: false });

    if (error) {
      throw mapPostgrestError(error);
    }

    return ((data ?? []) as unknown as RawSuscripcionRow[]).map(mapRawRow);
  },

  /**
   * Update a payment's status (approve or reject).
   *  - On approve: sets estado='validado', validado_por, and fecha_validacion.
   *  - On reject: sets estado='rechazado'.
   */
  async updatePagoEstado(
    id: string,
    estado: Extract<PagoEstado, 'validado' | 'rechazado'>,
    validadoPor: string,
  ): Promise<void> {
    const supabase = createClient();

    const payload: Record<string, unknown> = { estado };

    if (estado === 'validado') {
      payload.validado_por = validadoPor;
      payload.fecha_validacion = new Date().toISOString();
    }

    const { error } = await supabase
      .from('pagos')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw mapPostgrestError(error);
    }
  },

  /**
   * Update a subscription's status.
   *  - 'aprobar': sets estado='activa' + confirmed fecha_inicio/fecha_fin/clases_restantes.
   *  - 'cancelar': sets estado='cancelada'.
   */
  async updateSuscripcionEstado(
    id: string,
    action: 'aprobar' | 'cancelar',
    validadoPor: string,
    values?: ValidarSuscripcionFormValues,
  ): Promise<void> {
    const supabase = createClient();

    let payload: Record<string, unknown>;

    if (action === 'aprobar' && values) {
      payload = {
        estado: 'activa',
        fecha_inicio: values.fecha_inicio,
        fecha_fin: values.fecha_fin,
        clases_restantes: values.clases_restantes,
        validado_por: validadoPor,
      };
    } else {
      payload = { estado: 'cancelada' };
    }

    const { error } = await supabase
      .from('suscripciones')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw mapPostgrestError(error);
    }
  },
};
