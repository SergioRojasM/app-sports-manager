import { createClient } from '@/services/supabase/client';
import type {
  Reserva,
  ReservaView,
  ReservaCapacidad,
  CategoriaDisponibilidad,
  CreateReservaInput,
  UpdateReservaInput,
  ReservaReportRow,
} from '@/types/portal/reservas.types';
import type { BookingResult } from '@/types/portal/entrenamiento-restricciones.types';

// ─────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────

export type ReservaServiceErrorCode =
  | 'capacity_exceeded'
  | 'categoria_not_found'
  | 'duplicate_booking'
  | 'invalid_estado'
  | 'not_found'
  | 'forbidden'
  | 'unknown';

export class ReservaServiceError extends Error {
  code: ReservaServiceErrorCode;

  constructor(code: ReservaServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ReservaServiceError';
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

type PostgrestErrorLike = {
  code?: string;
  message?: string;
} | null;

function mapServiceError(error: PostgrestErrorLike): ReservaServiceError {
  if (!error) {
    return new ReservaServiceError('unknown', 'No fue posible completar la operación de reservas.');
  }

  if (error.code === '42501') {
    return new ReservaServiceError('forbidden', 'No tienes permisos para realizar esta acción.');
  }

  return new ReservaServiceError('unknown', error.message ?? 'No fue posible completar la operación de reservas.');
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

async function getByEntrenamiento(tenantId: string, entrenamientoId: string): Promise<ReservaView[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id,
      tenant_id,
      atleta_id,
      entrenamiento_id,
      entrenamiento_categoria_id,
      fecha_reserva,
      estado,
      notas,
      fecha_cancelacion,
      suscripcion_id,
      created_at,
      usuarios!reservas_atleta_id_fkey (
        nombre,
        apellido,
        email
      ),
      entrenamiento_categorias (
        nivel_disciplina (
          nombre
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('entrenamiento_id', entrenamientoId)
    .order('created_at', { ascending: false });

  if (error) {
    throw mapServiceError(error);
  }

  return (data ?? []).map((row) => {
    const usuario = row.usuarios as unknown as { nombre: string | null; apellido: string | null; email: string } | null;
    const catJoin = row.entrenamiento_categorias as unknown as { nivel_disciplina: { nombre: string } | null } | null;
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      atleta_id: row.atleta_id,
      entrenamiento_id: row.entrenamiento_id,
      entrenamiento_categoria_id: row.entrenamiento_categoria_id ?? null,
      fecha_reserva: row.fecha_reserva,
      estado: row.estado as Reserva['estado'],
      notas: row.notas,
      fecha_cancelacion: row.fecha_cancelacion,
      suscripcion_id: (row.suscripcion_id as string | null) ?? null,
      created_at: row.created_at,
      atleta_nombre: usuario?.nombre ?? '',
      atleta_apellido: usuario?.apellido ?? '',
      atleta_email: usuario?.email ?? '',
      categoria_nombre: catJoin?.nivel_disciplina?.nombre ?? null,
    };
  });
}

async function getMyReserva(
  tenantId: string,
  entrenamientoId: string,
  atletaId: string,
): Promise<Reserva | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entrenamiento_id', entrenamientoId)
    .eq('atleta_id', atletaId)
    .neq('estado', 'cancelada')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapServiceError(error);
  }

  return data as Reserva | null;
}

async function getCapacidad(tenantId: string, entrenamientoId: string): Promise<ReservaCapacidad> {
  const supabase = createClient();

  // Count active bookings (non-cancelled)
  const { count, error: countError } = await supabase
    .from('reservas')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('entrenamiento_id', entrenamientoId)
    .neq('estado', 'cancelada');

  if (countError) {
    throw mapServiceError(countError);
  }

  // Get cupo_maximo from entrenamientos
  const { data: entrenamiento, error: entError } = await supabase
    .from('entrenamientos')
    .select('cupo_maximo')
    .eq('id', entrenamientoId)
    .eq('tenant_id', tenantId)
    .single();

  if (entError) {
    throw mapServiceError(entError);
  }

  const reservasActivas = count ?? 0;
  const cupoMaximo = entrenamiento?.cupo_maximo ?? null;
  const disponible = cupoMaximo === null || reservasActivas < cupoMaximo;

  return {
    entrenamiento_id: entrenamientoId,
    cupo_maximo: cupoMaximo,
    reservas_activas: reservasActivas,
    disponible,
  };
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

async function getCategoriasConDisponibilidad(
  tenantId: string,
  entrenamientoId: string,
): Promise<CategoriaDisponibilidad[]> {
  const supabase = createClient();

  // Query 1: categories with level info
  const { data: categorias, error: catError } = await supabase
    .from('entrenamiento_categorias')
    .select(`
      id,
      nivel_id,
      cupos_asignados,
      nivel_disciplina!inner (
        nombre,
        orden
      )
    `)
    .eq('entrenamiento_id', entrenamientoId);

  if (catError) {
    throw mapServiceError(catError);
  }

  if (!categorias || categorias.length === 0) {
    return [];
  }

  // Query 2: active bookings per category
  const { data: reservas, error: resError } = await supabase
    .from('reservas')
    .select('entrenamiento_categoria_id')
    .eq('tenant_id', tenantId)
    .eq('entrenamiento_id', entrenamientoId)
    .neq('estado', 'cancelada')
    .not('entrenamiento_categoria_id', 'is', null);

  if (resError) {
    throw mapServiceError(resError);
  }

  // Count bookings per category
  const countMap = new Map<string, number>();
  for (const r of reservas ?? []) {
    const catId = r.entrenamiento_categoria_id as string;
    countMap.set(catId, (countMap.get(catId) ?? 0) + 1);
  }

  // Merge and return
  return categorias
    .map((cat) => {
      const nivel = cat.nivel_disciplina as unknown as { nombre: string; orden: number };
      const reservasActivas = countMap.get(cat.id) ?? 0;
      return {
        id: cat.id,
        nivel_id: cat.nivel_id,
        nombre: nivel.nombre,
        orden: nivel.orden,
        cupos_asignados: cat.cupos_asignados,
        reservas_activas: reservasActivas,
        disponible: reservasActivas < cat.cupos_asignados,
      };
    })
    .sort((a, b) => a.orden - b.orden);
}

async function getAtletaNivelId(
  tenantId: string,
  atletaId: string,
  disciplinaId: string,
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('usuario_nivel_disciplina')
    .select('nivel_id')
    .eq('tenant_id', tenantId)
    .eq('usuario_id', atletaId)
    .eq('disciplina_id', disciplinaId)
    .maybeSingle();

  if (error) {
    throw mapServiceError(error);
  }

  return data?.nivel_id ?? null;
}

// ─────────────────────────────────────────────
// Booking restriction validation
// ─────────────────────────────────────────────

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function validateBookingRestrictions(
  entrenamientoId: string,
  atletaId: string,
  tenantId: string,
): Promise<BookingResult> {
  const supabase = createClient();

  // 1. Load training record (timing + fecha_hora + disciplina)
  const { data: ent, error: entErr } = await supabase
    .from('entrenamientos')
    .select('fecha_hora, reserva_antelacion_horas, disciplina_id')
    .eq('id', entrenamientoId)
    .eq('tenant_id', tenantId)
    .single();

  if (entErr || !ent) {
    throw new ReservaServiceError('not_found', 'No se encontró el entrenamiento.');
  }

  const fechaHora = ent.fecha_hora as string | null;
  const reservaAntelacion = ent.reserva_antelacion_horas as number | null;
  const disciplinaId = ent.disciplina_id as string;

  // 2. Check timing restriction
  if (reservaAntelacion != null && fechaHora) {
    const cutoff = new Date(new Date(fechaHora).getTime() - reservaAntelacion * 3600000);
    if (new Date() > cutoff) {
      return {
        ok: false,
        code: 'TIMING_RESERVA',
        message: `Solo puedes reservar con al menos ${reservaAntelacion} h de antelación. El entrenamiento comienza el ${formatFechaHora(fechaHora)}.`,
      };
    }
  }

  // 3. Load restriction rows
  const { data: restricciones, error: restErr } = await supabase
    .from('entrenamiento_restricciones')
    .select('*')
    .eq('entrenamiento_id', entrenamientoId)
    .eq('tenant_id', tenantId)
    .order('orden', { ascending: true });

  if (restErr) throw mapServiceError(restErr);

  // Zero rows = unrestricted
  if (!restricciones || restricciones.length === 0) {
    return { ok: true };
  }

  // 4. Pre-fetch athlete data needed for evaluation
  // 4a. Tenant-scoped member status
  const { data: miembro } = await supabase
    .from('miembros_tenant')
    .select('estado')
    .eq('tenant_id', tenantId)
    .eq('usuario_id', atletaId)
    .single();
  const miembroEstado = (miembro?.estado as string) ?? null;

  // 4b. Active subscriptions
  const { data: suscripciones } = await supabase
    .from('suscripciones')
    .select('plan_id')
    .eq('tenant_id', tenantId)
    .eq('atleta_id', atletaId)
    .eq('estado', 'activa');
  const activePlanIds = new Set((suscripciones ?? []).map((s) => s.plan_id as string));

  // 4c. Plan-discipline mapping for active plans
  const activePlanArray = [...activePlanIds];
  let activeDisciplinaIds = new Set<string>();
  if (activePlanArray.length > 0) {
    const { data: pd } = await supabase
      .from('planes_disciplina')
      .select('disciplina_id')
      .in('plan_id', activePlanArray);
    activeDisciplinaIds = new Set((pd ?? []).map((r) => r.disciplina_id as string));
  }

  // 4d. Athlete's level for the training's discipline (if needed)
  const needsLevel = restricciones.some((r) => r.validar_nivel_disciplina);
  let atletaNivelOrden: number | null = null;
  if (needsLevel) {
    const { data: und } = await supabase
      .from('usuario_nivel_disciplina')
      .select('nivel_id')
      .eq('usuario_id', atletaId)
      .eq('tenant_id', tenantId)
      .eq('disciplina_id', disciplinaId)
      .maybeSingle();

    if (und?.nivel_id) {
      const { data: nivel } = await supabase
        .from('nivel_disciplina')
        .select('orden')
        .eq('id', und.nivel_id)
        .single();
      atletaNivelOrden = nivel?.orden as number | null ?? null;
    }
  }

  // 4e. Training category level (minimum level for this training)
  let entrenamientoNivelOrden: number | null = null;
  let entrenamientoNivelNombre: string | null = null;
  if (needsLevel) {
    const { data: cats } = await supabase
      .from('entrenamiento_categorias')
      .select('nivel_id, nivel_disciplina!inner(orden, nombre)')
      .eq('entrenamiento_id', entrenamientoId)
      .order('nivel_disciplina(orden)', { ascending: true })
      .limit(1);

    if (cats && cats.length > 0) {
      const nivel = (cats[0] as Record<string, unknown>).nivel_disciplina as { orden: number; nombre: string } | null;
      entrenamientoNivelOrden = nivel?.orden ?? null;
      entrenamientoNivelNombre = nivel?.nombre ?? null;
    }
  }

  // 5. Evaluate OR rows
  let firstRowRejection: BookingResult | null = null;

  for (const row of restricciones) {
    let rowPasses = true;
    let firstFailCode: BookingResult | null = null;

    // 5a. usuario_estado check (tenant-scoped)
    if (row.usuario_estado) {
      if (miembroEstado === null) {
        rowPasses = false;
        firstFailCode ??= {
          ok: false,
          code: 'USUARIO_INACTIVO',
          message: 'No se encontró tu membresía en esta organización.',
        };
      } else if (miembroEstado !== row.usuario_estado) {
        rowPasses = false;
        firstFailCode ??= {
          ok: false,
          code: 'USUARIO_INACTIVO',
          message: `Tu estado en esta organización no permite reservar este entrenamiento. Estado requerido: ${row.usuario_estado}. Tu estado actual: ${miembroEstado}. Contacta al administrador.`,
        };
      }
    }

    // 5b. plan_id
    if (row.plan_id && rowPasses) {
      if (!activePlanIds.has(row.plan_id as string)) {
        const { data: plan } = await supabase
          .from('planes')
          .select('nombre')
          .eq('id', row.plan_id)
          .single();
        const planName = (plan?.nombre as string | null) ?? 'el plan requerido';
        rowPasses = false;
        firstFailCode ??= {
          ok: false,
          code: 'PLAN_REQUERIDO',
          message: `Este entrenamiento requiere una suscripción activa al plan ${planName}.`,
        };
      }
    }

    // 5c. disciplina_id
    if (row.disciplina_id && rowPasses) {
      if (!activeDisciplinaIds.has(row.disciplina_id as string)) {
        const { data: disc } = await supabase
          .from('disciplinas')
          .select('nombre')
          .eq('id', row.disciplina_id)
          .single();
        const discName = (disc?.nombre as string | null) ?? 'la disciplina requerida';
        rowPasses = false;
        firstFailCode ??= {
          ok: false,
          code: 'DISCIPLINA_REQUERIDA',
          message: `Este entrenamiento requiere una suscripción activa que incluya la disciplina ${discName}.`,
        };
      }
    }

    // 5d. validar_nivel_disciplina
    if (row.validar_nivel_disciplina && rowPasses) {
      if (entrenamientoNivelOrden != null) {
        if (atletaNivelOrden == null || atletaNivelOrden < entrenamientoNivelOrden) {
          const { data: disc } = await supabase
            .from('disciplinas')
            .select('nombre')
            .eq('id', disciplinaId)
            .single();
          const discName = (disc?.nombre as string | null) ?? 'la disciplina';
          const levelName = entrenamientoNivelNombre ?? 'el nivel requerido';
          rowPasses = false;
          firstFailCode ??= {
            ok: false,
            code: 'NIVEL_INSUFICIENTE',
            message: `Tu nivel actual en ${discName} no es suficiente para este entrenamiento (mínimo: ${levelName}).`,
          };
        }
      }
    }

    if (rowPasses) {
      return { ok: true };
    }

    // Capture first row's rejection for the final result
    firstRowRejection ??= firstFailCode;
  }

  // No row passed — return rejection from first row
  return firstRowRejection ?? {
    ok: false,
    code: 'PLAN_REQUERIDO',
    message: 'No cumples los requisitos de acceso para este entrenamiento.',
  };
}

async function validateCancellationRestriction(
  entrenamientoId: string,
  tenantId: string,
  isAdminOrCoach: boolean,
): Promise<BookingResult> {
  if (isAdminOrCoach) return { ok: true };

  const supabase = createClient();
  const { data: ent, error: entErr } = await supabase
    .from('entrenamientos')
    .select('fecha_hora, cancelacion_antelacion_horas')
    .eq('id', entrenamientoId)
    .eq('tenant_id', tenantId)
    .single();

  if (entErr || !ent) {
    throw new ReservaServiceError('not_found', 'No se encontró el entrenamiento.');
  }

  const fechaHora = ent.fecha_hora as string | null;
  const cancelAntelacion = ent.cancelacion_antelacion_horas as number | null;

  if (cancelAntelacion != null && fechaHora) {
    const cutoff = new Date(new Date(fechaHora).getTime() - cancelAntelacion * 3600000);
    if (new Date() > cutoff) {
      return {
        ok: false,
        code: 'TIMING_CANCELACION',
        message: `Solo puedes cancelar con al menos ${cancelAntelacion} h de antelación. El entrenamiento comienza el ${formatFechaHora(fechaHora)}.`,
      };
    }
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// Subscription class deduction helper
// ─────────────────────────────────────────────

async function findSubscriptionToCharge(
  tenantId: string,
  atletaId: string,
  planId: string,
): Promise<{ suscripcionId: string | null; exhausted: boolean }> {
  const supabase = createClient();

  // Only consider subscriptions with available classes (>0) or unlimited (null)
  const { data, error } = await supabase
    .from('suscripciones')
    .select('id, clases_restantes')
    .eq('tenant_id', tenantId)
    .eq('atleta_id', atletaId)
    .eq('plan_id', planId)
    .eq('estado', 'activa')
    .or('clases_restantes.gt.0,clases_restantes.is.null')
    .order('clases_restantes', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapServiceError(error);
  }

  if (data) {
    // NULL clases_restantes = unlimited plan — no deduction needed
    if (data.clases_restantes === null) {
      return { suscripcionId: null, exhausted: false };
    }
    return { suscripcionId: data.id as string, exhausted: false };
  }

  // No subscription with available classes — check if any exhausted (0) exist
  const { count, error: countError } = await supabase
    .from('suscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('atleta_id', atletaId)
    .eq('plan_id', planId)
    .eq('estado', 'activa')
    .eq('clases_restantes', 0);

  if (countError) {
    throw mapServiceError(countError);
  }

  return { suscripcionId: null, exhausted: (count ?? 0) > 0 };
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

async function create(input: CreateReservaInput): Promise<Reserva | BookingResult> {
  // 0. Booking restriction check
  const restrictionResult = await validateBookingRestrictions(
    input.entrenamiento_id,
    input.atleta_id,
    input.tenant_id,
  );
  if (!restrictionResult.ok) return restrictionResult;

  const supabase = createClient();

  // 0b. Find subscription to charge (if plan-restricted training)
  let suscripcionId: string | null = null;

  const { data: restricciones } = await supabase
    .from('entrenamiento_restricciones')
    .select('plan_id')
    .eq('entrenamiento_id', input.entrenamiento_id)
    .eq('tenant_id', input.tenant_id)
    .not('plan_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (restricciones?.plan_id) {
    const chargeResult = await findSubscriptionToCharge(
      input.tenant_id,
      input.atleta_id,
      restricciones.plan_id as string,
    );

    if (chargeResult.exhausted) {
      return {
        ok: false,
        code: 'CLASES_AGOTADAS',
        message: 'No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan.',
      };
    }

    suscripcionId = chargeResult.suscripcionId;
  }

  // 1. Capacity check
  const capacidad = await getCapacidad(input.tenant_id, input.entrenamiento_id);
  if (!capacidad.disponible) {
    throw new ReservaServiceError(
      'capacity_exceeded',
      'No hay cupos disponibles para este entrenamiento.',
    );
  }

  // 2. Duplicate check
  const existing = await getMyReserva(input.tenant_id, input.entrenamiento_id, input.atleta_id);
  if (existing) {
    throw new ReservaServiceError(
      'duplicate_booking',
      'El atleta ya tiene una reserva activa para este entrenamiento.',
    );
  }

  // 3. Per-category capacity check
  if (input.entrenamiento_categoria_id) {
    const supabaseCheck = createClient();
    const { data: catRow, error: catCheckErr } = await supabaseCheck
      .from('entrenamiento_categorias')
      .select('id, cupos_asignados')
      .eq('id', input.entrenamiento_categoria_id)
      .eq('entrenamiento_id', input.entrenamiento_id)
      .maybeSingle();

    if (catCheckErr) {
      throw mapServiceError(catCheckErr);
    }

    if (!catRow) {
      throw new ReservaServiceError(
        'categoria_not_found',
        'La categoría seleccionada no pertenece a este entrenamiento.',
      );
    }

    const { count: catActiveCount, error: catCountErr } = await supabaseCheck
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('entrenamiento_id', input.entrenamiento_id)
      .eq('entrenamiento_categoria_id', input.entrenamiento_categoria_id)
      .neq('estado', 'cancelada');

    if (catCountErr) {
      throw mapServiceError(catCountErr);
    }

    if ((catActiveCount ?? 0) >= catRow.cupos_asignados) {
      throw new ReservaServiceError(
        'capacity_exceeded',
        'No hay cupos disponibles para el nivel seleccionado.',
      );
    }
  }

  // 4. Insert via atomic RPC (deducts class + inserts reservation)
  const { data, error } = await supabase.rpc('book_and_deduct_class', {
    p_tenant_id: input.tenant_id,
    p_atleta_id: input.atleta_id,
    p_entrenamiento_id: input.entrenamiento_id,
    p_entrenamiento_categoria_id: input.entrenamiento_categoria_id ?? null,
    p_notas: input.notas?.trim() || null,
    p_suscripcion_id: suscripcionId,
  });

  if (error) {
    // Concurrent race: another booking consumed the last class
    if (error.code === 'P0001' && error.message?.includes('CLASES_AGOTADAS')) {
      return {
        ok: false,
        code: 'CLASES_AGOTADAS',
        message: 'No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan.',
      };
    }
    throw mapServiceError(error);
  }

  return data as Reserva;
}

async function update(id: string, tenantId: string, input: UpdateReservaInput): Promise<Reserva> {
  const supabase = createClient();

  const patch: Record<string, unknown> = {};

  if (input.estado !== undefined) {
    patch.estado = input.estado;
    if (input.estado === 'cancelada') {
      patch.fecha_cancelacion = new Date().toISOString();
    }
  }

  if (input.notas !== undefined) {
    patch.notas = input.notas.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    throw new ReservaServiceError('unknown', 'No hay cambios para actualizar.');
  }

  const { data, error } = await supabase
    .from('reservas')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    throw mapServiceError(error);
  }

  if (!data) {
    throw new ReservaServiceError('not_found', 'La reserva no fue encontrada.');
  }

  return data as Reserva;
}

async function cancel(
  id: string,
  tenantId: string,
  entrenamientoId?: string,
  isAdminOrCoach?: boolean,
): Promise<Reserva | BookingResult> {
  // Cancellation timing restriction (only for athletes)
  if (entrenamientoId) {
    const cancResult = await validateCancellationRestriction(
      entrenamientoId,
      tenantId,
      isAdminOrCoach ?? false,
    );
    if (!cancResult.ok) return cancResult;
  }

  // Fetch suscripcion_id from the reservation for class restoration
  const supabase = createClient();
  const { data: reserva, error: fetchErr } = await supabase
    .from('reservas')
    .select('suscripcion_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !reserva) {
    throw new ReservaServiceError('not_found', 'La reserva no fue encontrada.');
  }

  // Cancel via atomic RPC (updates status + restores class if applicable)
  const { data, error } = await supabase.rpc('cancel_and_restore_class', {
    p_reserva_id: id,
    p_tenant_id: tenantId,
    p_suscripcion_id: (reserva.suscripcion_id as string | null) ?? null,
  });

  if (error) {
    throw mapServiceError(error);
  }

  return data as Reserva;
}

async function deleteReserva(id: string, tenantId: string): Promise<void> {
  const supabase = createClient();

  // Verify estado allows delete
  const { data: existing, error: fetchError } = await supabase
    .from('reservas')
    .select('estado')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !existing) {
    throw new ReservaServiceError('not_found', 'La reserva no fue encontrada.');
  }

  if (existing.estado !== 'pendiente' && existing.estado !== 'cancelada') {
    throw new ReservaServiceError(
      'invalid_estado',
      'Solo se pueden eliminar reservas en estado pendiente o cancelada.',
    );
  }

  const { error } = await supabase
    .from('reservas')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    throw mapServiceError(error);
  }
}

// ─────────────────────────────────────────────
// Report query (for CSV export)
// ─────────────────────────────────────────────

async function getReservasReport(
  tenantId: string,
  entrenamientoId: string,
): Promise<ReservaReportRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('reservas_reporte_view')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entrenamiento_id', entrenamientoId)
    .order('created_at', { ascending: true });

  if (error) {
    throw mapServiceError(error);
  }

  return (data ?? []) as ReservaReportRow[];
}

// ─────────────────────────────────────────────
// Service export
// ─────────────────────────────────────────────

export const reservasService = {
  getByEntrenamiento,
  getMyReserva,
  getCapacidad,
  getCategoriasConDisponibilidad,
  getAtletaNivelId,
  getReservasReport,
  validateBookingRestrictions,
  validateCancellationRestriction,
  create,
  update,
  cancel,
  delete: deleteReserva,
};
