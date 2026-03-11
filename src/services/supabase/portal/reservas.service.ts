import { createClient } from '@/services/supabase/client';
import type {
  Reserva,
  ReservaView,
  ReservaCapacidad,
  CategoriaDisponibilidad,
  CreateReservaInput,
  UpdateReservaInput,
} from '@/types/portal/reservas.types';

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

async function create(input: CreateReservaInput): Promise<Reserva> {
  const supabase = createClient();

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

  // 4. Insert
  const { data, error } = await supabase
    .from('reservas')
    .insert({
      tenant_id: input.tenant_id,
      atleta_id: input.atleta_id,
      entrenamiento_id: input.entrenamiento_id,
      entrenamiento_categoria_id: input.entrenamiento_categoria_id ?? null,
      estado: 'confirmada',
      fecha_reserva: new Date().toISOString(),
      notas: input.notas?.trim() || null,
    })
    .select()
    .single();

  if (error) {
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

async function cancel(id: string, tenantId: string): Promise<Reserva> {
  return update(id, tenantId, {
    estado: 'cancelada',
    fecha_cancelacion: new Date().toISOString(),
  });
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
// Service export
// ─────────────────────────────────────────────

export const reservasService = {
  getByEntrenamiento,
  getMyReserva,
  getCapacidad,
  getCategoriasConDisponibilidad,
  getAtletaNivelId,
  create,
  update,
  cancel,
  delete: deleteReserva,
};
