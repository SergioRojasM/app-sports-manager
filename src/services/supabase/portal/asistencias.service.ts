import { createClient } from '@/services/supabase/client';
import type { Asistencia, UpsertAsistenciaInput } from '@/types/portal/asistencias.types';

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

async function getByEntrenamiento(
  tenantId: string,
  entrenamientoId: string,
): Promise<Record<string, Asistencia>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('asistencias')
    .select(
      `
      id,
      tenant_id,
      reserva_id,
      validado_por,
      fecha_asistencia,
      asistio,
      observaciones,
      created_at,
      reservas!asistencias_reserva_id_fkey (
        entrenamiento_id
      )
    `,
    )
    .eq('tenant_id', tenantId)
    .eq('reservas.entrenamiento_id', entrenamientoId);

  if (error) {
    throw new Error(error.message ?? 'No fue posible cargar las asistencias.');
  }

  const map: Record<string, Asistencia> = {};
  for (const row of data ?? []) {
    map[row.reserva_id] = {
      id: row.id,
      tenant_id: row.tenant_id,
      reserva_id: row.reserva_id,
      validado_por: row.validado_por,
      fecha_asistencia: row.fecha_asistencia,
      asistio: row.asistio,
      observaciones: row.observaciones,
      created_at: row.created_at,
    };
  }

  return map;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

async function upsert(input: UpsertAsistenciaInput): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('asistencias')
    .upsert(input, { onConflict: 'reserva_id' });

  if (error) {
    throw new Error(error.message ?? 'No fue posible guardar la asistencia.');
  }
}

async function deleteById(tenantId: string, asistenciaId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('asistencias')
    .delete()
    .eq('id', asistenciaId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(error.message ?? 'No fue posible eliminar la asistencia.');
  }
}

// ─────────────────────────────────────────────
// Exported service object
// ─────────────────────────────────────────────

export const asistenciasService = {
  getByEntrenamiento,
  upsert,
  deleteById,
};
