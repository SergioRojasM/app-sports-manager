import { createClient } from '@/services/supabase/client';
import type {
  Reserva,
  ReservaView,
  ReservaCapacidad,
  CreateReservaInput,
  UpdateReservaInput,
} from '@/types/portal/reservas.types';

// ─────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────

export type ReservaServiceErrorCode =
  | 'capacity_exceeded'
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
      fecha_reserva,
      estado,
      notas,
      fecha_cancelacion,
      created_at,
      usuarios!reservas_atleta_id_fkey (
        nombre,
        apellido,
        email
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
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      atleta_id: row.atleta_id,
      entrenamiento_id: row.entrenamiento_id,
      fecha_reserva: row.fecha_reserva,
      estado: row.estado as Reserva['estado'],
      notas: row.notas,
      fecha_cancelacion: row.fecha_cancelacion,
      created_at: row.created_at,
      atleta_nombre: usuario?.nombre ?? '',
      atleta_apellido: usuario?.apellido ?? '',
      atleta_email: usuario?.email ?? '',
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

  // 3. Insert
  const { data, error } = await supabase
    .from('reservas')
    .insert({
      tenant_id: input.tenant_id,
      atleta_id: input.atleta_id,
      entrenamiento_id: input.entrenamiento_id,
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
  create,
  update,
  cancel,
  delete: deleteReserva,
};
