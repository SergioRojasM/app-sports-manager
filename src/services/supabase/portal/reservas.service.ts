import { createClient } from '@/services/supabase/client';
import { bogotaDayStartIso, bogotaDayEndIso } from '@/lib/portal/bogota-date';
import type {
  Reserva,
  ReservaView,
  ReservaCapacidad,
  CategoriaDisponibilidad,
  CreateReservaInput,
  UpdateReservaInput,
  ReservaReportRow,
  ReservasManagementFilters,
  MisReservasFilters,
} from '@/types/portal/reservas.types';
import type { BookingResult, EntrenamientoRestriccion } from '@/types/portal/entrenamiento-restricciones.types';

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
  | 'formulario_campos_faltantes'
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
      formulario_respuesta_id,
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
      formulario_respuesta_id: (row.formulario_respuesta_id as string | null) ?? null,
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

function toLocalDateString(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function validateBookingRestrictions(
  entrenamientoId: string,
  atletaId: string,
  tenantId: string,
): Promise<{ result: BookingResult; matchedRow: EntrenamientoRestriccion | null }> {
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
        result: {
          ok: false,
          code: 'TIMING_RESERVA',
          message: `Solo puedes reservar con al menos ${reservaAntelacion} h de antelación. El entrenamiento comienza el ${formatFechaHora(fechaHora)}.`,
        },
        matchedRow: null,
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
    return { result: { ok: true }, matchedRow: null };
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

  // 4b. Active service entitlements — set of servicio_id with available units, as of the training's date
  const referenceDate = toLocalDateString(fechaHora);
  const entitlements = await getServicioEntitlements(tenantId, atletaId, referenceDate);

  const activeServicioIds = new Set<string>(
    Array.from(entitlements.entries())
      .filter(([, entries]) => entries.some((e) => e.unidadesRestantes === null || e.unidadesRestantes > 0))
      .map(([servicioId]) => servicioId),
  );

  // 4c. Athlete's level for the training's discipline (if needed)
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

  // 4d. Training category level (minimum level for this training)
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

  for (const row of restricciones as EntrenamientoRestriccion[]) {
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

    // 5b. servicio_1_id … servicio_4_id (AND — all non-null slots must be in the entitlement set)
    const serviceSlots = [row.servicio_1_id, row.servicio_2_id, row.servicio_3_id, row.servicio_4_id].filter(
      (s): s is string => s != null,
    );

    for (const servicioId of serviceSlots) {
      if (!rowPasses) break;
      if (!activeServicioIds.has(servicioId)) {
        // Fetch service name for a friendly message
        const { data: svc } = await supabase
          .from('servicios')
          .select('nombre')
          .eq('id', servicioId)
          .single();
        const svcNameRaw = svc?.nombre as string | null;
        const svcName = svcNameRaw ?? 'el servicio requerido';
        rowPasses = false;
        firstFailCode ??= {
          ok: false,
          code: 'SERVICIO_REQUERIDO',
          message: `Este entrenamiento requiere una suscripción activa con unidades disponibles en el servicio: ${svcName}.`,
          ...(svcNameRaw ? { servicioNombre: svcNameRaw } : {}),
        };
      }
    }

    // 5c. validar_nivel_disciplina
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
      return { result: { ok: true }, matchedRow: row };
    }

    // Capture first row's rejection for the final result
    firstRowRejection ??= firstFailCode;
  }

  // No row passed — return rejection from first row
  return {
    result: firstRowRejection ?? {
      ok: false,
      code: 'SERVICIO_REQUERIDO',
      message: 'No cumples los requisitos de acceso para este entrenamiento.',
    },
    matchedRow: null,
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
// Service subscription deduction helpers
// ─────────────────────────────────────────────

type ServiceChargeEntry = {
  suscripcionId: string | null;
  servicioId: string;
  exhausted: boolean;
};

type ServicioEntitlement = {
  suscripcionId: string;
  unidadesRestantes: number | null;
};

async function getServicioEntitlements(
  tenantId: string,
  atletaId: string,
  referenceDate: string,
  { includeVencidas = false }: { includeVencidas?: boolean } = {},
): Promise<Map<string, ServicioEntitlement[]>> {
  const supabase = createClient();

  let query = supabase
    .from('suscripcion_servicios')
    .select(
      'servicio_id, suscripcion_id, unidades_restantes, suscripciones!inner(tenant_id, atleta_id, estado, fecha_inicio, fecha_fin)',
    )
    .eq('suscripciones.tenant_id', tenantId)
    .eq('suscripciones.atleta_id', atletaId);

  if (includeVencidas) {
    query = query.in('suscripciones.estado', ['activa', 'vencida']);
  } else {
    query = query.eq('suscripciones.estado', 'activa');
  }

  const { data, error } = await query;

  if (error) throw mapServiceError(error);

  const entitlements = new Map<string, ServicioEntitlement[]>();

  for (const row of data ?? []) {
    const suscripcion = row.suscripciones as unknown as { fecha_inicio: string | null; fecha_fin: string | null };
    const fechaInicio = suscripcion.fecha_inicio;
    const fechaFin = suscripcion.fecha_fin;

    const covers =
      (fechaInicio === null || fechaInicio <= referenceDate) &&
      (fechaFin === null || fechaFin >= referenceDate);

    if (!covers) continue;

    const servicioId = row.servicio_id as string;
    const list = entitlements.get(servicioId) ?? [];
    list.push({
      suscripcionId: row.suscripcion_id as string,
      unidadesRestantes: row.unidades_restantes as number | null,
    });
    entitlements.set(servicioId, list);
  }

  for (const list of entitlements.values()) {
    list.sort((a, b) => {
      if (a.unidadesRestantes === b.unidadesRestantes) return 0;
      if (a.unidadesRestantes === null) return 1;
      if (b.unidadesRestantes === null) return -1;
      return a.unidadesRestantes - b.unidadesRestantes;
    });
  }

  return entitlements;
}

async function findServiceSubscriptionsToCharge(
  tenantId: string,
  atletaId: string,
  servicioIds: string[],
  referenceDate: string,
  { includeVencidas = false }: { includeVencidas?: boolean } = {},
): Promise<ServiceChargeEntry[]> {
  if (servicioIds.length === 0) return [];

  const entitlements = await getServicioEntitlements(tenantId, atletaId, referenceDate, { includeVencidas });
  const results: ServiceChargeEntry[] = [];

  for (const servicioId of servicioIds) {
    const entries = entitlements.get(servicioId) ?? [];
    const available = entries.find((e) => e.unidadesRestantes === null || e.unidadesRestantes > 0);

    if (available) {
      // NULL = unlimited — include in log but no deduction needed
      results.push({
        suscripcionId: available.unidadesRestantes === null ? null : available.suscripcionId,
        servicioId,
        exhausted: false,
      });
    } else {
      const exhausted = entries.some((e) => e.unidadesRestantes === 0);
      results.push({ suscripcionId: null, servicioId, exhausted });
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// Helpers — past-date guard
// ─────────────────────────────────────────────

async function isEntrenamientoPast(
  entrenamientoId: string,
  tenantId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('entrenamientos')
    .select('fecha_hora')
    .eq('id', entrenamientoId)
    .eq('tenant_id', tenantId)
    .single();

  if (!data?.fecha_hora) return false;
  return new Date(data.fecha_hora) < new Date();
}

async function getEntrenamientoFechaHora(
  entrenamientoId: string,
  tenantId: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('entrenamientos')
    .select('fecha_hora')
    .eq('id', entrenamientoId)
    .eq('tenant_id', tenantId)
    .single();

  return (data?.fecha_hora as string | null) ?? null;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

async function create(input: CreateReservaInput): Promise<Reserva | BookingResult> {
  let matchedRow: EntrenamientoRestriccion | null = null;

  // Reference date for service-entitlement eligibility — the training's date, or today if unscheduled
  const fechaHora = await getEntrenamientoFechaHora(input.entrenamiento_id, input.tenant_id);
  const referenceDate = toLocalDateString(fechaHora);

  if (!input.bypass_restrictions) {
    // 0. Past-date guard
    const past = await isEntrenamientoPast(input.entrenamiento_id, input.tenant_id);
    if (past) {
      return {
        ok: false,
        code: 'ENTRENAMIENTO_PASADO',
        message: 'No puedes reservar un entrenamiento que ya ha finalizado.',
      };
    }

    // 1. Booking restriction check
    const { result: restrictionResult, matchedRow: row } = await validateBookingRestrictions(
      input.entrenamiento_id,
      input.atleta_id,
      input.tenant_id,
    );
    if (!restrictionResult.ok) return restrictionResult;
    matchedRow = row;
  }

  const supabase = createClient();

  // 1b. Admin: resolve matchedRow by evaluating only service slots (OR rows, AND slots within row)
  if (input.bypass_restrictions) {
    const { data: restricciones } = await supabase
      .from('entrenamiento_restricciones')
      .select('*')
      .eq('entrenamiento_id', input.entrenamiento_id)
      .eq('tenant_id', input.tenant_id)
      .order('orden', { ascending: true });

    if (restricciones && restricciones.length > 0) {
      // Build active service entitlement set for this athlete, as of the training's date
      const entitlements = await getServicioEntitlements(input.tenant_id, input.atleta_id, referenceDate, { includeVencidas: true });

      const activeServicioIds = new Set<string>(
        Array.from(entitlements.entries())
          .filter(([, entries]) => entries.some((e) => e.unidadesRestantes === null || e.unidadesRestantes > 0))
          .map(([servicioId]) => servicioId),
      );

      // Find first row where all service slots are covered
      for (const row of restricciones as EntrenamientoRestriccion[]) {
        const slots = [row.servicio_1_id, row.servicio_2_id, row.servicio_3_id, row.servicio_4_id].filter(
          (s): s is string => s != null,
        );
        if (slots.length === 0 || slots.every((s) => activeServicioIds.has(s))) {
          matchedRow = row;
          break;
        }
      }

      // No row matched — athlete has no units. Ask admin to confirm.
      if (!matchedRow && !input.confirmed_no_units) {
        const hasServiceSlots = (restricciones as EntrenamientoRestriccion[]).some(
          (r) => r.servicio_1_id != null || r.servicio_2_id != null || r.servicio_3_id != null || r.servicio_4_id != null,
        );
        if (hasServiceSlots) {
          return {
            ok: false,
            code: 'ADMIN_CONFIRM_NO_UNITS',
            message: 'El atleta no tiene unidades disponibles en los servicios requeridos. ¿Deseas crear la reserva de todas formas sin descontar unidades?',
          };
        }
      }
    }
  }

  // 2. Resolve deductions from matched restriction row service slots
  const serviceSlots = matchedRow
    ? [matchedRow.servicio_1_id, matchedRow.servicio_2_id, matchedRow.servicio_3_id, matchedRow.servicio_4_id].filter(
        (s): s is string => s != null,
      )
    : [];

  let deductions: Array<{ suscripcion_id: string | null; servicio_id: string }> = [];

  if (serviceSlots.length > 0) {
    const chargeEntries = await findServiceSubscriptionsToCharge(
      input.tenant_id,
      input.atleta_id,
      serviceSlots,
      referenceDate,
      { includeVencidas: !!input.bypass_restrictions },
    );

    const exhaustedEntry = chargeEntries.find((e) => e.exhausted);
    if (exhaustedEntry) {
      const { data: exhaustedSvc } = await supabase
        .from('servicios')
        .select('nombre')
        .eq('id', exhaustedEntry.servicioId)
        .single();
      const exhaustedSvcName = exhaustedSvc?.nombre as string | null;

      return {
        ok: false,
        code: 'UNIDADES_AGOTADAS',
        message: 'No te quedan unidades disponibles de uno o más servicios requeridos para este entrenamiento.',
        ...(exhaustedSvcName ? { servicioNombre: exhaustedSvcName } : {}),
      };
    }

    deductions = chargeEntries.map((e) => ({
      suscripcion_id: e.suscripcionId,
      servicio_id: e.servicioId,
    }));
  }

  if (!input.bypass_restrictions) {
    // 3. Capacity check
    const capacidad = await getCapacidad(input.tenant_id, input.entrenamiento_id);
    if (!capacidad.disponible) {
      throw new ReservaServiceError(
        'capacity_exceeded',
        'No hay cupos disponibles para este entrenamiento.',
      );
    }
  }

  // 4. Duplicate check — always runs
  const existing = await getMyReserva(input.tenant_id, input.entrenamiento_id, input.atleta_id);
  if (existing) {
    throw new ReservaServiceError(
      'duplicate_booking',
      'El atleta ya tiene una reserva activa para este entrenamiento.',
    );
  }

  // 5. Per-category capacity check — skipped for admin override
  if (input.entrenamiento_categoria_id && !input.bypass_restrictions) {
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

  // 6. Insert via atomic RPC (deducts service units + inserts reservation)
  const { data, error } = await supabase.rpc('book_and_deduct_service_units', {
    p_tenant_id: input.tenant_id,
    p_atleta_id: input.atleta_id,
    p_entrenamiento_id: input.entrenamiento_id,
    p_entrenamiento_categoria_id: input.entrenamiento_categoria_id ?? null,
    p_notas: input.notas?.trim() || null,
    p_deductions: deductions,
    p_formulario_plantilla_id: input.formulario_plantilla_id ?? null,
    p_formulario_respuesta: input.formulario_respuesta ?? null,
  });

  if (error) {
    if (error.code === 'P0001' && error.message?.includes('SUSCRIPCION_INACTIVA')) {
      return {
        ok: false,
        code: 'SERVICIO_REQUERIDO',
        message: 'La suscripción utilizada ya no está activa. No es posible completar la reserva.',
      };
    }
    if (error.code === 'P0001' && error.message?.includes('UNIDADES_AGOTADAS')) {
      return {
        ok: false,
        code: 'UNIDADES_AGOTADAS',
        message: 'No te quedan unidades disponibles de uno o más servicios requeridos para este entrenamiento.',
      };
    }
    if (error.code === 'P0001' && error.message?.includes('FORMULARIO_CAMPOS_FALTANTES')) {
      return {
        ok: false,
        code: 'FORMULARIO_CAMPOS_FALTANTES',
        message: 'Faltan campos obligatorios del formulario.',
      };
    }
    if (error.code === 'P0001' && error.message?.includes('PERFIL_INCOMPLETO')) {
      return {
        ok: false,
        code: 'PERFIL_INCOMPLETO',
        message: 'Tu perfil no tiene todos los datos que requiere este formulario. Actualízalo para continuar.',
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
  // Past-date guard (athletes only)
  if (entrenamientoId && !isAdminOrCoach) {
    const past = await isEntrenamientoPast(entrenamientoId, tenantId);
    if (past) {
      return {
        ok: false,
        code: 'ENTRENAMIENTO_PASADO',
        message: 'No puedes cancelar la reserva de un entrenamiento que ya ha finalizado.',
      };
    }
  }

  // Cancellation timing restriction (only for athletes)
  if (entrenamientoId) {
    const cancResult = await validateCancellationRestriction(
      entrenamientoId,
      tenantId,
      isAdminOrCoach ?? false,
    );
    if (!cancResult.ok) return cancResult;
  }

  // Cancel via atomic RPC (updates status + restores service units from reserva_servicios ledger)
  const supabase = createClient();
  const { data, error } = await supabase.rpc('cancel_and_restore_service_units', {
    p_reserva_id: id,
    p_tenant_id: tenantId,
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
// Management query (cross-training with filters)
// ─────────────────────────────────────────────

async function getReservasManagement(
  filters: ReservasManagementFilters,
): Promise<ReservaReportRow[]> {
  const supabase = createClient();

  let query = supabase
    .from('reservas_reporte_view')
    .select('*')
    .eq('tenant_id', filters.tenantId);

  if (filters.fechaDesde) {
    query = query.gte('entrenamiento_fecha', bogotaDayStartIso(filters.fechaDesde));
  }

  if (filters.fechaHasta) {
    query = query.lte('entrenamiento_fecha', bogotaDayEndIso(filters.fechaHasta));
  }

  if (filters.atletaSearch) {
    const term = `%${filters.atletaSearch}%`;
    query = query.or(
      `atleta_nombre.ilike.${term},atleta_apellido.ilike.${term},atleta_email.ilike.${term},numero_identificacion.ilike.${term}`,
    );
  }

  if (filters.asistencia === 'asistio') {
    query = query.eq('asistio', true);
  } else if (filters.asistencia === 'no_asistio') {
    query = query.eq('asistio', false);
  } else if (filters.asistencia === 'sin_registrar') {
    query = query.is('asistio', null);
  }

  if (filters.disciplinaNombre) {
    query = query.eq('disciplina', filters.disciplinaNombre);
  }

  query = query.order('entrenamiento_fecha', { ascending: false, nullsFirst: false });

  const hasActiveFilters = !!(
    filters.fechaDesde ||
    filters.fechaHasta ||
    filters.atletaSearch ||
    filters.asistencia ||
    filters.disciplinaNombre
  );

  if (!hasActiveFilters) {
    query = query.limit(filters.limit ?? 100);
  }

  const { data, error } = await query;

  if (error) {
    throw mapServiceError(error);
  }

  return (data ?? []) as ReservaReportRow[];
}

// ─────────────────────────────────────────────
// Athlete personal reservations (US-0074)
// ─────────────────────────────────────────────

async function getMisReservas(
  filters: MisReservasFilters,
): Promise<ReservaReportRow[]> {
  const supabase = createClient();

  let query = supabase
    .from('reservas_reporte_view')
    .select('*')
    .eq('atleta_id', filters.atletaId);

  if (filters.tenantId) {
    query = query.eq('tenant_id', filters.tenantId);
  }

  if (filters.fechaDesde) {
    query = query.gte('entrenamiento_fecha', bogotaDayStartIso(filters.fechaDesde));
  }

  if (filters.fechaHasta) {
    query = query.lte('entrenamiento_fecha', bogotaDayEndIso(filters.fechaHasta));
  }

  if (filters.asistencia === 'asistio') {
    query = query.eq('asistio', true);
  } else if (filters.asistencia === 'no_asistio') {
    query = query.eq('asistio', false);
  } else if (filters.asistencia === 'sin_registrar') {
    query = query.is('asistio', null);
  }

  if (filters.disciplinaNombre) {
    query = query.eq('disciplina', filters.disciplinaNombre);
  }

  query = query.order('entrenamiento_fecha', { ascending: false, nullsFirst: false });

  const hasActiveFilters = !!(
    filters.fechaDesde ||
    filters.fechaHasta ||
    filters.asistencia ||
    filters.disciplinaNombre
  );

  if (!hasActiveFilters) {
    query = query.limit(filters.limit ?? 100);
  }

  const { data, error } = await query;

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
  getReservasManagement,
  getMisReservas,
  validateBookingRestrictions,
  validateCancellationRestriction,
  create,
  update,
  cancel,
  delete: deleteReserva,
};
