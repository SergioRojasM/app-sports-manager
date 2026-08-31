import { createClient } from '@/services/supabase/client';
import {
  EntrenamientoPublicoServiceError,
  type CronogramaItem,
  type EntrenamientoPublico,
  type IncluyeItem,
  type PrecioItem,
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

  // The DB trigger is the authority on the publish rule; surface its exception
  // as the same typed error the pre-check uses, never as a raw Postgres error.
  if (error.message?.includes('siendo miembro de la organización')) {
    return new EntrenamientoPublicoServiceError('membership_restriction', MEMBERSHIP_RESTRICTION_MESSAGE);
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

export const MEMBERSHIP_RESTRICTION_MESSAGE =
  'Este entrenamiento solo admite restricciones que un visitante externo nunca puede cumplir (estado de miembro o nivel de disciplina). Añade una condición basada en servicios o elimina esas restricciones para poder publicarlo.';

/**
 * True when the training cannot be booked by a non-member under ANY of its
 * restriction rows (US-0094).
 *
 * Restriction rows are OR-ed at booking time and the conditions within a row are
 * ANDed, so the rule is "no row is satisfiable without membership" — NOT "some
 * row is membership-only", which would wrongly block a training that also has a
 * service-only row an outsider can satisfy by buying the granting plan.
 *
 * Mirrors the `check_entrenamiento_publico_restricciones_membresia()` trigger,
 * which remains the authority.
 */
async function getPublishRestrictionSummary(
  tenantId: string,
  entrenamientoId: string,
): Promise<{ blocking: boolean; servicioIds: string[] }> {
  const restricciones = await entrenamientosService.getInstanceRestrictions(tenantId, entrenamientoId);

  const servicioIds = Array.from(
    new Set(
      restricciones.flatMap((row) => {
        const r = row as Record<string, unknown>;
        return [r.servicio_1_id, r.servicio_2_id, r.servicio_3_id, r.servicio_4_id].filter(
          (id): id is string => typeof id === 'string',
        );
      }),
    ),
  );

  const blocking =
    restricciones.length > 0 &&
    !restricciones.some((row) => {
      const r = row as Record<string, unknown>;
      return r.usuario_estado == null && r.validar_nivel_disciplina !== true;
    });

  return { blocking, servicioIds };
}

async function hasBlockingMembershipRestrictions(tenantId: string, entrenamientoId: string): Promise<boolean> {
  const { blocking } = await getPublishRestrictionSummary(tenantId, entrenamientoId);
  return blocking;
}

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Mirrors the `entrenador_nombre` expression in `entrenamientos_publicos_view`
 * (`nullif(trim(concat(nombre, ' ', apellido)), '')`) so the authenticated
 * marketplace and the anon-safe view agree on the same display name (US-0109).
 */
/**
 * NOTE: the `entrenador` embed above MUST name the FK constraint explicitly —
 * `entrenamientos_publicos` has two foreign keys into `usuarios`
 * (`entrenador_id` and `publicado_por`), so a bare `usuarios(...)` embed is
 * ambiguous and makes PostgREST reject the whole query, blanking the
 * marketplace listing rather than just omitting the name.
 */
function toEntrenadorNombre(entrenador: { nombre: string | null; apellido: string | null } | null): string | null {
  if (!entrenador) return null;
  return toNullable([entrenador.nombre ?? '', entrenador.apellido ?? ''].join(' '));
}

/**
 * Column list read from the anon-safe `entrenamientos_publicos_view`. Shared by
 * the landing listing and the single-training detail lookup so both surfaces
 * always project — and map — exactly the same shape (US-0109).
 */
const VIEW_SELECT_COLUMNS =
  'id, tenant_id, entrenamiento_id, nombre, descripcion, descripcion_larga, pagina_evento_url, disciplina_id, fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro, reserva_antelacion_horas, cancelacion_antelacion_horas, precio, cronograma, incluye, banner_url, omitir_confirmacion_plan, created_at, disciplina_nombre, escenario_nombre, escenario_ubicacion, tenant_nombre, tenant_logo_url, entrenador_nombre, reservas_activas';

type PublicTrainingViewRow = {
  id: string;
  tenant_id: string;
  entrenamiento_id: string;
  nombre: string | null;
  descripcion: string | null;
  descripcion_larga: string | null;
  pagina_evento_url: string | null;
  disciplina_id: string;
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  punto_encuentro: string | null;
  reserva_antelacion_horas: number | null;
  cancelacion_antelacion_horas: number | null;
  precio: PrecioItem[] | null;
  cronograma: CronogramaItem[] | null;
  incluye: IncluyeItem[] | null;
  banner_url: string | null;
  omitir_confirmacion_plan: boolean;
  created_at: string;
  disciplina_nombre: string | null;
  escenario_nombre: string | null;
  escenario_ubicacion: string | null;
  tenant_nombre: string | null;
  tenant_logo_url: string | null;
  entrenador_nombre: string | null;
  reservas_activas: number;
};

function mapViewRow(row: PublicTrainingViewRow): PublicTrainingListItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantNombre: row.tenant_nombre ?? 'Organización',
    tenantLogoUrl: row.tenant_logo_url,
    entrenamientoId: row.entrenamiento_id,
    nombre: row.nombre ?? 'Entrenamiento',
    descripcion: row.descripcion,
    disciplinaId: row.disciplina_id,
    disciplinaNombre: row.disciplina_nombre ?? 'Disciplina',
    escenarioNombre: row.escenario_nombre ?? 'Escenario',
    escenarioUbicacion: row.escenario_ubicacion,
    fechaHora: row.fecha_hora,
    duracionMinutos: row.duracion_minutos,
    cupoMaximo: row.cupo_maximo,
    puntoEncuentro: row.punto_encuentro,
    reservaAntelacionHoras: row.reserva_antelacion_horas,
    cancelacionAntelacionHoras: row.cancelacion_antelacion_horas,
    // jsonb arrives already parsed from Postgrest; the `?? []` guards legacy rows
    precio: row.precio ?? [],
    descripcionLarga: row.descripcion_larga,
    paginaEventoUrl: row.pagina_evento_url,
    cronograma: row.cronograma ?? [],
    incluye: row.incluye ?? [],
    entrenadorNombre: row.entrenador_nombre,
    bannerUrl: row.banner_url,
    reservasActivas: row.reservas_activas,
    // Deliberately empty: these surfaces must not query the authenticated-only
    // servicios view, which an anonymous visitor cannot read (US-0094).
    serviciosRequeridos: [],
    // Read from the view (not hardcoded false) because the detail page books
    // directly and passes this through to the booking modal (US-0109).
    omitirConfirmacionPlan: row.omitir_confirmacion_plan,
    createdAt: row.created_at,
    // Deliberately null: formulario tables are authenticated-only, and neither the
    // landing grid nor the detail page offers the "Vista previa" action (US-0101).
    formularioId: null,
    formularioExterno: null,
  };
}

export const entrenamientosPublicosService = {
  hasBlockingMembershipRestrictions,
  getPublishRestrictionSummary,

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

    if (await hasBlockingMembershipRestrictions(input.tenantId, input.entrenamientoId)) {
      throw new EntrenamientoPublicoServiceError('membership_restriction', MEMBERSHIP_RESTRICTION_MESSAGE);
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
      descripcion_larga: toNullable(input.descripcionLarga),
      pagina_evento_url: toNullable(input.paginaEventoUrl),
      cronograma: input.cronograma,
      incluye: input.incluye,
      banner_url: input.banner_url,
      omitir_confirmacion_plan: input.omitirConfirmacionPlan,
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
        'id, tenant_id, entrenamiento_id, nombre, descripcion, descripcion_larga, pagina_evento_url, disciplina_id, fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro, reserva_antelacion_horas, cancelacion_antelacion_horas, precio, cronograma, incluye, banner_url, omitir_confirmacion_plan, created_at, disciplina:disciplinas(nombre), escenario:escenarios(nombre, ubicacion), tenant:tenants(nombre, logo_url), entrenador:usuarios!entrenamientos_publicos_entrenador_id_fkey(nombre, apellido)',
      )
      .eq('activo', true)
      .gte('fecha_hora', new Date().toISOString())
      .order('fecha_hora', { ascending: true });

    if (error) {
      throw mapServiceError(error);
    }

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      tenant_id: string;
      entrenamiento_id: string;
      nombre: string | null;
      descripcion: string | null;
      descripcion_larga: string | null;
      pagina_evento_url: string | null;
      disciplina_id: string;
      fecha_hora: string | null;
      duracion_minutos: number | null;
      cupo_maximo: number | null;
      punto_encuentro: string | null;
      reserva_antelacion_horas: number | null;
      cancelacion_antelacion_horas: number | null;
      precio: PrecioItem[] | null;
      cronograma: CronogramaItem[] | null;
      incluye: IncluyeItem[] | null;
      banner_url: string | null;
      omitir_confirmacion_plan: boolean;
      created_at: string;
      disciplina: { nombre: string | null } | null;
      escenario: { nombre: string | null; ubicacion: string | null } | null;
      tenant: { nombre: string | null; logo_url: string | null } | null;
      entrenador: { nombre: string | null; apellido: string | null } | null;
    }>;

    const capacidades = await Promise.all(
      rows.map((row) => reservasService.getCapacidad(row.tenant_id, row.entrenamiento_id).catch(() => null)),
    );

    // Required-service names come from the authenticated-only view: an authenticated
    // NON-member cannot read `servicios` directly when no public plan grants the
    // service, which is exactly the case this must cover (US-0094). One query for the
    // whole page — never per row — and a failure degrades to no requirements rather
    // than failing the listing.
    const serviciosByEntrenamiento = new Map<string, string[]>();
    const { data: serviciosRows, error: serviciosError } = await supabase
      .from('entrenamientos_publicos_servicios_view')
      .select('entrenamiento_id, servicios_requeridos');

    if (!serviciosError) {
      for (const row of (serviciosRows ?? []) as unknown as Array<{
        entrenamiento_id: string;
        servicios_requeridos: string[] | null;
      }>) {
        serviciosByEntrenamiento.set(row.entrenamiento_id, row.servicios_requeridos ?? []);
      }
    }

    // Formulario attachment lives on the source `entrenamientos` row — never duplicated
    // onto `entrenamientos_publicos` (US-0089) — so it's fetched via one batched query for
    // the whole visible list, never per row (US-0101).
    const formularioByEntrenamiento = new Map<string, { formularioId: string | null; formularioExterno: string | null }>();
    if (rows.length > 0) {
      const { data: formularioRows, error: formularioError } = await supabase
        .from('entrenamientos')
        .select('id, formulario_id, formulario_externo')
        .in(
          'id',
          rows.map((row) => row.entrenamiento_id),
        );

      if (!formularioError) {
        for (const row of (formularioRows ?? []) as unknown as Array<{
          id: string;
          formulario_id: string | null;
          formulario_externo: string | null;
        }>) {
          formularioByEntrenamiento.set(row.id, {
            formularioId: row.formulario_id,
            formularioExterno: row.formulario_externo,
          });
        }
      }
    }

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
      // jsonb arrives already parsed from Postgrest; the `?? []` guards legacy
      // rows written before the columns existed (US-0109)
      precio: row.precio ?? [],
      descripcionLarga: row.descripcion_larga,
      paginaEventoUrl: row.pagina_evento_url,
      cronograma: row.cronograma ?? [],
      incluye: row.incluye ?? [],
      entrenadorNombre: toEntrenadorNombre(row.entrenador),
      bannerUrl: row.banner_url,
      reservasActivas: capacidades[index]?.reservas_activas ?? 0,
      serviciosRequeridos: serviciosByEntrenamiento.get(row.entrenamiento_id) ?? [],
      omitirConfirmacionPlan: row.omitir_confirmacion_plan,
      createdAt: row.created_at,
      formularioId: formularioByEntrenamiento.get(row.entrenamiento_id)?.formularioId ?? null,
      formularioExterno: formularioByEntrenamiento.get(row.entrenamiento_id)?.formularioExterno ?? null,
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

  async listPublicTrainingsForLanding(): Promise<PublicTrainingListItem[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamientos_publicos_view')
      .select(VIEW_SELECT_COLUMNS)
      .order('fecha_hora', { ascending: true });

    if (error) {
      throw mapServiceError(error);
    }

    return ((data ?? []) as unknown as PublicTrainingViewRow[]).map(mapViewRow);
  },

  /**
   * Single published training for the public detail page (US-0109).
   *
   * Reads the anon-safe view, so it resolves identically whether the visitor is
   * anonymous or authenticated. Returns null when no row matches — the view
   * already filters `activo = true and fecha_hora >= now()`, so an unpublished,
   * deactivated, or past training is indistinguishable from a bad id here, and
   * all four render the same "not found" state.
   */
  async getPublicTrainingDetail(entrenamientoId: string): Promise<PublicTrainingListItem | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamientos_publicos_view')
      .select(VIEW_SELECT_COLUMNS)
      .eq('entrenamiento_id', entrenamientoId)
      .maybeSingle();

    if (error) {
      throw mapServiceError(error);
    }

    if (!data) return null;

    return mapViewRow(data as unknown as PublicTrainingViewRow);
  },
};
