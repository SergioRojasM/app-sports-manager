import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InicioStats,
  InicioEntrenamiento,
  InicioSuscripcion,
  InicioPagoPendiente,
  InicioMembresia,
} from '@/types/portal/inicio.types';

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export async function fetchInicioStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<InicioStats> {
  const [suscripciones, entrenamientos, pagos, organizaciones] = await Promise.all([
    supabase
      .from('suscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('atleta_id', userId)
      .eq('estado', 'activa'),

    supabase
      .from('reservas')
      .select('*, entrenamientos!inner(fecha_hora)', { count: 'exact', head: true })
      .eq('atleta_id', userId)
      .in('estado', ['pendiente', 'confirmada'])
      .gte('entrenamientos.fecha_hora', new Date().toISOString()),

    supabase
      .from('pagos')
      .select('*, suscripciones!inner(atleta_id)', { count: 'exact', head: true })
      .eq('suscripciones.atleta_id', userId)
      .eq('estado', 'pendiente'),

    supabase
      .from('miembros_tenant')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId),
  ]);

  return {
    suscripcionesActivas: suscripciones.count ?? 0,
    proximosEntrenamientos: entrenamientos.count ?? 0,
    pagosPendientes: pagos.count ?? 0,
    organizaciones: organizaciones.count ?? 0,
  };
}

// ─────────────────────────────────────────────
// Próximos entrenamientos (via reservas)
// ─────────────────────────────────────────────

export async function fetchProximosEntrenamientos(
  supabase: SupabaseClient,
  userId: string,
  limit = 5,
): Promise<InicioEntrenamiento[]> {
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id,
      estado,
      entrenamiento_id,
      entrenamientos!inner (
        id,
        nombre,
        fecha_hora,
        punto_encuentro,
        tenant_id,
        disciplina_id,
        escenario_id,
        disciplinas ( nombre ),
        escenarios ( nombre ),
        tenants!entrenamientos_tenant_id_fkey ( nombre )
      )
    `)
    .eq('atleta_id', userId)
    .in('estado', ['pendiente', 'confirmada'])
    .gte('entrenamientos.fecha_hora', new Date().toISOString())
    .order('fecha_hora', { referencedTable: 'entrenamientos', ascending: true })
    .limit(limit);

  if (error) {
    console.error('fetchProximosEntrenamientos error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const e = row.entrenamientos as unknown as {
      id: string;
      nombre: string;
      fecha_hora: string;
      punto_encuentro: string | null;
      tenant_id: string;
      disciplina_id: string | null;
      escenario_id: string | null;
      disciplinas: { nombre: string } | null;
      escenarios: { nombre: string } | null;
      tenants: { nombre: string } | null;
    };

    return {
      id: e.id,
      nombre: e.nombre,
      fecha_hora: e.fecha_hora,
      disciplina_nombre: e.disciplinas?.nombre ?? null,
      escenario_nombre: e.escenarios?.nombre ?? null,
      punto_encuentro: e.punto_encuentro,
      org_nombre: e.tenants?.nombre ?? '',
      tenant_id: e.tenant_id,
      reserva_id: row.id,
      reserva_estado: row.estado as string,
    };
  });
}

// ─────────────────────────────────────────────
// Suscripciones
// ─────────────────────────────────────────────

export async function fetchMisSuscripciones(
  supabase: SupabaseClient,
  userId: string,
): Promise<InicioSuscripcion[]> {
  const { data, error } = await supabase
    .from('suscripciones')
    .select(`
      id,
      tenant_id,
      estado,
      fecha_inicio,
      fecha_fin,
      clases_restantes,
      clases_plan,
      planes ( nombre ),
      tenants!suscripciones_tenant_id_fkey ( nombre ),
      pagos ( estado )
    `)
    .eq('atleta_id', userId)
    .in('estado', ['activa', 'pendiente'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchMisSuscripciones error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const plan = row.planes as unknown as { nombre: string } | null;
    const tenant = row.tenants as unknown as { nombre: string } | null;
    const pagos = row.pagos as unknown as Array<{ estado: string }> | null;
    const ultimoPago = pagos?.length ? pagos[pagos.length - 1] : null;

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      plan_nombre: plan?.nombre ?? '',
      org_nombre: tenant?.nombre ?? '',
      estado: row.estado as string,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      clases_restantes: row.clases_restantes,
      clases_plan: row.clases_plan,
      pago_estado: ultimoPago?.estado ?? null,
    };
  });
}

// ─────────────────────────────────────────────
// Pagos pendientes
// ─────────────────────────────────────────────

export async function fetchPagosPendientes(
  supabase: SupabaseClient,
  userId: string,
): Promise<InicioPagoPendiente[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select(`
      id,
      monto,
      metodo_pago,
      fecha_pago,
      suscripciones!inner (
        atleta_id,
        planes ( nombre ),
        tenants!suscripciones_tenant_id_fkey ( nombre )
      )
    `)
    .eq('suscripciones.atleta_id', userId)
    .eq('estado', 'pendiente');

  if (error) {
    console.error('fetchPagosPendientes error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const sus = row.suscripciones as unknown as {
      atleta_id: string;
      planes: { nombre: string } | null;
      tenants: { nombre: string } | null;
    };

    return {
      id: row.id,
      monto: row.monto as number,
      metodo_pago: row.metodo_pago as string | null,
      plan_nombre: sus.planes?.nombre ?? '',
      org_nombre: sus.tenants?.nombre ?? '',
      fecha_pago: row.fecha_pago as string | null,
    };
  });
}

// ─────────────────────────────────────────────
// Membresías
// ─────────────────────────────────────────────

export async function fetchMisMembresias(
  supabase: SupabaseClient,
  userId: string,
): Promise<InicioMembresia[]> {
  const { data, error } = await supabase
    .from('miembros_tenant')
    .select(`
      tenant_id,
      tenants ( nombre, logo_url ),
      roles ( nombre )
    `)
    .eq('usuario_id', userId);

  if (error) {
    console.error('fetchMisMembresias error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const tenant = row.tenants as unknown as { nombre: string; logo_url: string | null } | null;
    const role = row.roles as unknown as { nombre: string } | null;

    return {
      tenant_id: row.tenant_id,
      org_nombre: tenant?.nombre ?? '',
      org_logo: tenant?.logo_url ?? null,
      rol_nombre: role?.nombre ?? '',
    };
  });
}
