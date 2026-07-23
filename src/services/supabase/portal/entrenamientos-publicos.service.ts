import { createClient } from '@/services/supabase/client';
import {
  EntrenamientoPublicoServiceError,
  type EntrenamientoPublico,
  type PublicarEntrenamientoInput,
  type PublicTrainingListItem,
} from '@/types/portal/entrenamientos-publicos.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';
import { entrenamientosService } from './entrenamientos.service';
import { reservasService } from './reservas.service';

type PostgrestErrorLike = {
  code?: string;
  message?: string;
} | null;

function mapServiceError(error: PostgrestErrorLike): EntrenamientoPublicoServiceError {
  if (!error) {
    return new EntrenamientoPublicoServiceError('unknown', 'No fue posible completar la operación de publicación.');
  }

  if (error.message?.includes('restricciones de servicios')) {
    return new EntrenamientoPublicoServiceError(
      'servicio_restriction',
      'Este entrenamiento tiene restricciones de servicios y no puede publicarse. Elimina las restricciones de servicio del entrenamiento para poder publicarlo.',
    );
  }

  if (error.code === '23505') {
    return new EntrenamientoPublicoServiceError('duplicate', 'Este entrenamiento ya tiene una publicación.');
  }

  if (error.code === '23503') {
    return new EntrenamientoPublicoServiceError('fk_dependency', 'No se pudo completar la operación por dependencias relacionadas.');
  }

  if (error.code === '42501') {
    return new EntrenamientoPublicoServiceError('forbidden', 'No tienes permisos para publicar este entrenamiento.');
  }

  if (error.code === '23514' || error.code === 'P0001') {
    return new EntrenamientoPublicoServiceError('validation', 'Los datos no cumplen las reglas de validación de la publicación.');
  }

  return new EntrenamientoPublicoServiceError('unknown', 'No fue posible completar la operación de publicación.');
}

async function hasServicioRestrictions(tenantId: string, entrenamientoId: string): Promise<boolean> {
  const restricciones = await entrenamientosService.getInstanceRestrictions(tenantId, entrenamientoId);
  return restricciones.some(
    (row) =>
      (row as Record<string, unknown>).servicio_1_id != null ||
      (row as Record<string, unknown>).servicio_2_id != null ||
      (row as Record<string, unknown>).servicio_3_id != null ||
      (row as Record<string, unknown>).servicio_4_id != null,
  );
}

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export const entrenamientosPublicosService = {
  hasServicioRestrictions,

  async getPublicacionByEntrenamientoId(tenantId: string, entrenamientoId: string): Promise<EntrenamientoPublico | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamientos_publicos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entrenamiento_id', entrenamientoId)
      .maybeSingle();

    if (error) {
      throw mapServiceError(error);
    }

    return (data as EntrenamientoPublico | null) ?? null;
  },

  async listPublishedEntrenamientoIds(tenantId: string): Promise<Set<string>> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamientos_publicos')
      .select('entrenamiento_id')
      .eq('tenant_id', tenantId);

    if (error) {
      throw mapServiceError(error);
    }

    return new Set((data ?? []).map((row) => row.entrenamiento_id as string));
  },

  async publicarEntrenamiento(input: PublicarEntrenamientoInput): Promise<EntrenamientoPublico> {
    const supabase = createClient();

    if (await hasServicioRestrictions(input.tenantId, input.entrenamientoId)) {
      throw new EntrenamientoPublicoServiceError(
        'servicio_restriction',
        'Este entrenamiento tiene restricciones de servicios y no puede publicarse. Elimina las restricciones de servicio del entrenamiento para poder publicarlo.',
      );
    }

    const { data: sourceTraining, error: sourceError } = await supabase
      .from('entrenamientos')
      .select(
        'disciplina_id, escenario_id, entrenador_id, fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro, estado, reserva_antelacion_horas, cancelacion_antelacion_horas',
      )
      .eq('id', input.entrenamientoId)
      .eq('tenant_id', input.tenantId)
      .single();

    if (sourceError || !sourceTraining) {
      throw mapServiceError(sourceError);
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;

    const existing = await this.getPublicacionByEntrenamientoId(input.tenantId, input.entrenamientoId);

    const commonPatch = {
      nombre: toNullable(input.nombre),
      descripcion: toNullable(input.descripcion),
      disciplina_id: sourceTraining.disciplina_id,
      escenario_id: sourceTraining.escenario_id,
      entrenador_id: sourceTraining.entrenador_id,
      fecha_hora: sourceTraining.fecha_hora,
      duracion_minutos: sourceTraining.duracion_minutos,
      cupo_maximo: sourceTraining.cupo_maximo,
      punto_encuentro: sourceTraining.punto_encuentro,
      estado: sourceTraining.estado,
      reserva_antelacion_horas: sourceTraining.reserva_antelacion_horas,
      cancelacion_antelacion_horas: sourceTraining.cancelacion_antelacion_horas,
      precio: input.precio,
      banner_url: input.banner_url,
      activo: true,
    };

    if (existing) {
      const { data, error } = await supabase
        .from('entrenamientos_publicos')
        .update(commonPatch)
        .eq('id', existing.id)
        .eq('tenant_id', input.tenantId)
        .select('*')
        .single();

      if (error || !data) {
        throw mapServiceError(error);
      }

      return data as EntrenamientoPublico;
    }

    const { data, error } = await supabase
      .from('entrenamientos_publicos')
      .insert({
        ...commonPatch,
        tenant_id: input.tenantId,
        entrenamiento_id: input.entrenamientoId,
        publicado_por: userId,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw mapServiceError(error);
    }

    return data as EntrenamientoPublico;
  },

  async despublicarEntrenamiento(tenantId: string, id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('entrenamientos_publicos')
      .update({ activo: false })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw mapServiceError(error);
    }
  },

  async listPublicTrainings(): Promise<PublicTrainingListItem[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamientos_publicos')
      .select(
        'id, tenant_id, entrenamiento_id, nombre, descripcion, disciplina_id, fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro, reserva_antelacion_horas, cancelacion_antelacion_horas, precio, banner_url, created_at, disciplina:disciplinas(nombre), escenario:escenarios(nombre, ubicacion), tenant:tenants(nombre, logo_url)',
      )
      .eq('activo', true)
      .gte('fecha_hora', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw mapServiceError(error);
    }

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      tenant_id: string;
      entrenamiento_id: string;
      nombre: string | null;
      descripcion: string | null;
      disciplina_id: string;
      fecha_hora: string | null;
      duracion_minutos: number | null;
      cupo_maximo: number | null;
      punto_encuentro: string | null;
      reserva_antelacion_horas: number | null;
      cancelacion_antelacion_horas: number | null;
      precio: number | null;
      banner_url: string | null;
      created_at: string;
      disciplina: { nombre: string | null } | null;
      escenario: { nombre: string | null; ubicacion: string | null } | null;
      tenant: { nombre: string | null; logo_url: string | null } | null;
    }>;

    const capacidades = await Promise.all(
      rows.map((row) => reservasService.getCapacidad(row.tenant_id, row.entrenamiento_id).catch(() => null)),
    );

    return rows.map((row, index) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantNombre: row.tenant?.nombre ?? 'Organización',
      tenantLogoUrl: row.tenant?.logo_url ?? null,
      entrenamientoId: row.entrenamiento_id,
      nombre: row.nombre ?? 'Entrenamiento',
      descripcion: row.descripcion,
      disciplinaId: row.disciplina_id,
      disciplinaNombre: row.disciplina?.nombre ?? 'Disciplina',
      escenarioNombre: row.escenario?.nombre ?? 'Escenario',
      escenarioUbicacion: row.escenario?.ubicacion ?? null,
      fechaHora: row.fecha_hora,
      duracionMinutos: row.duracion_minutos,
      cupoMaximo: row.cupo_maximo,
      puntoEncuentro: row.punto_encuentro,
      reservaAntelacionHoras: row.reserva_antelacion_horas,
      cancelacionAntelacionHoras: row.cancelacion_antelacion_horas,
      precio: row.precio,
      bannerUrl: row.banner_url,
      reservasActivas: capacidades[index]?.reservas_activas ?? 0,
      createdAt: row.created_at,
    }));
  },

  async listPublicTenantOptions(): Promise<SelectOption[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamientos_publicos')
      .select('tenant_id, tenant:tenants(nombre)')
      .eq('activo', true);

    if (error) {
      throw mapServiceError(error);
    }

    const seen = new Map<string, string>();
    for (const row of (data ?? []) as unknown as Array<{ tenant_id: string; tenant: { nombre: string | null } | null }>) {
      if (!seen.has(row.tenant_id)) {
        seen.set(row.tenant_id, row.tenant?.nombre ?? 'Organización');
      }
    }

    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  },
};
