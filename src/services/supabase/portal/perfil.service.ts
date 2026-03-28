import { createClient } from '@/services/supabase/client';
import {
  PerfilServiceError,
  type PerfilDeportivo,
  type PerfilUsuario,
} from '@/types/portal/perfil.types';

/* ────────── Error mapper ────────── */

function mapError(error: { code?: string; message?: string } | null): PerfilServiceError {
  if (!error) return new PerfilServiceError('unknown', 'Operación fallida.');
  if (error.code === '42501') {
    return new PerfilServiceError('forbidden', 'No tienes permisos para esta operación.');
  }
  if (error.code === 'PGRST116') {
    return new PerfilServiceError('not_found', 'Registro no encontrado.');
  }
  return new PerfilServiceError('unknown', error.message ?? 'Operación fallida.');
}

/* ────────── Queries ────────── */

/**
 * Fetch the authenticated user's personal info and sports profile in parallel.
 * Returns `deportivo: null` if no perfil_deportivo row exists yet.
 */
export async function getPerfil(
  userId: string,
): Promise<{ usuario: PerfilUsuario; deportivo: PerfilDeportivo | null }> {
  const supabase = createClient();

  const [usuarioResult, deportivoResult] = await Promise.all([
    supabase
      .from('usuarios')
      .select(
        'id, email, nombre, apellido, telefono, fecha_nacimiento, foto_url, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, rh',
      )
      .eq('id', userId)
      .single(),
    supabase
      .from('perfil_deportivo')
      .select('id, user_id, peso_kg, altura_cm')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (usuarioResult.error) throw mapError(usuarioResult.error);

  return {
    usuario: usuarioResult.data as PerfilUsuario,
    deportivo: deportivoResult.data ?? null,
  };
}

/**
 * Update the user's personal information in `public.usuarios`.
 * `id` and `email` are never included in the payload.
 */
export async function updatePerfil(
  userId: string,
  data: Partial<Omit<PerfilUsuario, 'id' | 'email'>>,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('usuarios').update(data).eq('id', userId);

  if (error) throw mapError(error);
}

/**
 * Upsert the user's sports profile in `public.perfil_deportivo`.
 * Inserts a new row if one doesn't exist, otherwise updates the existing one.
 */
export async function upsertPerfilDeportivo(
  userId: string,
  data: { peso_kg: number | null; altura_cm: number | null },
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('perfil_deportivo')
    .upsert({ user_id: userId, ...data }, { onConflict: 'user_id' });

  if (error) throw mapError(error);
}
